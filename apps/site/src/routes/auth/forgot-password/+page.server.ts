import { fail, type Actions } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const actions: Actions = {
	sendPasswordResetEmail: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email');

		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { message: 'Please enter a valid email address.' });
		}

		try {
			await auth.api.requestPasswordReset({
				body: {
					email,
					redirectTo: '/auth/reset-password'
				},
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { message: err.body?.message ?? 'Could not send reset email.' });
			}
			console.error('Forgot password error:', err);
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return {
			message: 'If an account with that email exists, a reset link has been sent.'
		};
	}
};
