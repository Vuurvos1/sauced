import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	return {
		hasToken: Boolean(token)
	};
};

export const actions: Actions = {
	resetPassword: async ({ request }) => {
		const formData = await request.formData();

		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');
		const token = formData.get('token');

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}

		if (typeof token !== 'string' || !token) {
			return fail(400, { message: 'Reset token is missing from the request.' });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword: password, token },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, {
					message: err.body?.message ?? 'The password reset link is invalid or has expired.'
				});
			}
			console.error('Reset password error:', err);
			return fail(500, { message: 'There was a problem with your submission.' });
		}

		throw redirect(302, '/login');
	}
};
