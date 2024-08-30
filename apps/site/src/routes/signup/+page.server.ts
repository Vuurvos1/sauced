import { lucia } from '$lib/server/lucia';
import { fail, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
import { hash } from '@node-rs/argon2';
import { db } from '$lib/db';
import { userTable } from '@app/db/schema';
import postgres from 'postgres';
import { checkIfUserExists } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
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

		try {
			const existingUser = await checkIfUserExists(email);
			if (existingUser && existingUser.authMethods.includes('email')) {
				return fail(400, {
					message: 'Email already used'
				});
			}

			const userId = existingUser?.id ?? generateId(15);
			const passwordHash = await hash(password, {
				// recommended minimum parameters
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			if (!existingUser) {
				await db.insert(userTable).values({
					id: userId,
					email,
					username,
					passwordHash,
					authMethods: ['email']
				});
			} else {
				await db
					.update(userTable)
					.set({
						username,
						passwordHash,
						authMethods: [...existingUser.authMethods, 'email']
					})
					.where(eq(userTable.email, email));
			}

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
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
		return redirect(302, '/');
	}
};
