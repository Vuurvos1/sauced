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
import { usernameSchema, emailSchema, passwordSchema } from '$lib/validation';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	signup: async ({ request, cookies }) => {
		const formData = await request.formData();
		const formUsername = formData.get('username');
		const formPassword = formData.get('password');
		const formEmaill = formData.get('email');

		if (!formUsername) {
			return fail(400, {
				message: 'Username is required'
			});
		}

		if (!formPassword) {
			return fail(400, {
				message: 'Password is required'
			});
		}

		if (!formEmaill) {
			return fail(400, {
				message: 'Email is required'
			});
		}

		const usernameResult = usernameSchema.safeParse(formUsername);
		if (!usernameResult.success) {
			const errors = usernameResult.error.issues.map((issue) => issue.message);
			return fail(400, {
				message: errors[0]
			});
		}
		const username = usernameResult.data;

		const emailResult = emailSchema.safeParse(formEmaill);
		if (!emailResult.success) {
			return fail(400, {
				message: 'Invalid email'
			});
		}
		const email = emailResult.data;

		// TODO: add a pwned password check
		const passwordResult = passwordSchema.safeParse(formPassword);
		if (!passwordResult.success) {
			const errors = passwordResult.error.issues.map((issue) => issue.message);
			return fail(400, {
				message: errors[0]
			});
		}
		const password = passwordResult.data;

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
