import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { db } from '$lib/db';
import { userTable } from '@app/db/schema';
import postgres from 'postgres';
import { checkIfUserExists, createEmailVerificationToken } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { sendEmailVerificationToken } from '$lib/server/email';
import { hashSettings } from '$lib/server/utils';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	signup: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');
		const email = formData.get('email');
		if (
			typeof username !== 'string' ||
			username.length < 3 ||
			username.length > 31 ||
			!/^[a-z0-9_-]+$/.test(username)
		) {
			return fail(400, {
				message: 'Invalid username'
			});
		}
		if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
			return fail(400, {
				message: 'Invalid password'
			});
		}
		if (typeof email !== 'string' || email.length < 3 || email.length > 255) {
			return fail(400, {
				message: 'Invalid email'
			});
		}
		// TODO: dissalow duplicate emails containing a plus sign, could be limited on a db level?

		try {
			const existingUser = await checkIfUserExists(email);
			if (existingUser && existingUser.authMethods.includes('email')) {
				return fail(400, {
					message: 'Email already used'
				});
			}

			let userId = existingUser?.id;
			const passwordHash = await hash(password, hashSettings);

			if (!existingUser) {
				const [{ id }] = await db
					.insert(userTable)
					.values({
						id: userId,
						email,
						username,
						passwordHash,
						emailVerified: false,
						authMethods: ['email']
					})
					.returning({ id: userTable.id });
				userId = id;
			} else {
				await db
					.update(userTable)
					.set({
						username,
						passwordHash
					})
					.where(eq(userTable.email, email));
			}

			const emailVerificationCode = await createEmailVerificationToken(userId, email);

			const sendEmailVerificationCodeResult = await sendEmailVerificationToken(
				email,
				emailVerificationCode
			);

			if (!sendEmailVerificationCodeResult.success) {
				return fail(500, {
					message: 'Failed to send email verification code'
				});
			}

			const pendingVerificationUserData = JSON.stringify({ id: userId, email: email });

			cookies.set('pendingUserVerification', pendingVerificationUserData, {
				path: '/auth/email-verification'
			});
		} catch (err) {
			if (err instanceof postgres.PostgresError && err.code === '23505') {
				return fail(400, {
					message: 'Username already used'
				});
			}

			console.error(err);

			return fail(500, {
				message: 'An unknown error occurred'
			});
		}

		throw redirect(303, '/auth/email-verification');
	}
};
