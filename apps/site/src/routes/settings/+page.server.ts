import { fail, redirect, type Actions } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '@app/db/schema';
import { eq } from 'drizzle-orm';
import { usernameSchema } from '$lib/validation/index.js';

export async function load({ locals }) {
	if (!locals.user) {
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
			return fail(400, { messages: ['Username is required'] });
		}

		const usernameResult = usernameSchema.safeParse(formUsername);
		if (!usernameResult.success) {
			const errors = usernameResult.error.issues.map((issue) => issue.message);
			return fail(400, { messages: errors });
		}
		const username = usernameResult.data;

		try {
			await db.update(user).set({ username }).where(eq(user.id, locals.session.userId));
		} catch (error) {
			console.error(error);
			return fail(500, { messages: ['Failed to update username'] });
		}
	},
	deleteAccount: async ({ locals, request }) => {
		if (!locals.session) {
			return fail(401);
		}

		const formData = await request.formData();
		const confirm = formData.get('confirm');

		if (confirm !== 'DELETE') {
			return fail(400, { message: 'Invalid confirmation' });
		}

		const userId = locals.session.userId;

		await auth.api.signOut({ headers: request.headers });

		await db.delete(user).where(eq(user.id, userId));

		return redirect(302, '/');
	}
};
