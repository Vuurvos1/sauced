import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ url }) => {
	return {
		email: url.searchParams.get('email') ?? ''
	};
};

export const actions: Actions = {
	resend: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email');

		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { message: 'Please enter a valid email address.' });
		}

		try {
			await auth.api.sendVerificationEmail({
				body: { email, callbackURL: '/' },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				return fail(400, { message: err.body?.message ?? 'Could not send verification email.' });
			}
			console.error('Resend verification error:', err);
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { message: 'A new verification link has been sent to your email.' };
	}
};
