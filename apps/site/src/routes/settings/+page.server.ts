import { invalidateSession, deleteSessionTokenCookie } from '$lib/server/session';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { db } from '$lib/db';
import { userTable } from '@app/db/schema';
import { eq } from 'drizzle-orm';

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
		const username = formData.get('username') as string | null;

		if (username) {
			try {
				await db.update(userTable).set({ username }).where(eq(userTable.id, locals.session.userId));
			} catch (error) {
				console.error(error);
				return fail(500, {
					message: 'Failed to update username'
				});
			}
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
