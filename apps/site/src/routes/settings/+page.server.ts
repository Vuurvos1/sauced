import { invalidateSession, deleteSessionTokenCookie } from '$lib/server/session';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userTable } from '@app/db/schema';
import { eq } from 'drizzle-orm';
import { usernameSchema } from '$lib/validation/index.js';

export async function load({ locals: { user } }) {
	if (!user) {
		redirect(302, '/');
	}
}

export const actions: Actions = {
	updateUser: async ({ locals, request }) => {
		if (!locals.session) {
			return fail(401);
		}

		const formData = await request.formData();
		const formUsername = formData.get('username');

		if (!formUsername) {
			return fail(400, {
				messages: ['Username is required']
			});
		}

		const usernameError = usernameSchema.safeParse(formUsername);
		if (!usernameError.success) {
			const errors = usernameError.error.issues.map((issue) => issue.message);
			return fail(400, {
				messages: errors
			});
		}
		const username = usernameError.data;

		try {
			await db.update(userTable).set({ username }).where(eq(userTable.id, locals.session.userId));
		} catch (error) {
			console.error(error);
			return fail(500, {
				messages: ['Failed to update username']
			});
		}
	},
	deleteAccount: async ({ locals, cookies, request }) => {
		if (!locals.session) {
			return fail(401);
		}

		const formData = await request.formData();
		const confirm = formData.get('confirm');

		if (confirm !== 'DELETE') {
			return fail(400, {
				message: 'Invalid confirmation'
			});
		}

		// delete user
		await db.delete(userTable).where(eq(userTable.id, locals.session.userId));

		// invalidate session
		await invalidateSession(locals.session.id);
		deleteSessionTokenCookie(cookies);

		return redirect(302, '/');
	}
};
