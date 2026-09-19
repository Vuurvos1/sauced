import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { usernameSchema, passwordSchema, emailSchema } from '$lib/validation';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

const signupSchema = z.object({
	username: usernameSchema,
	email: emailSchema,
	password: passwordSchema
});

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}

	const form = await superValidate(zod4(signupSchema));

	return { form };
};

export const actions: Actions = {
	signup: async ({ request }) => {
		const form = await superValidate(request, zod4(signupSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, email, password } = form.data;

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: username,
					username
				},
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				if (err.body?.code === 'USER_ALREADY_EXISTS') {
					return message(form, 'An account with this email already exists', { status: 400 });
				}
				if (err.body?.code === 'PASSWORD_COMPROMISED') {
					return message(
						form,
						'This password has been found in a data breach. Please choose a different password.',
						{ status: 400 }
					);
				}
				return message(form, err.body?.message ?? 'Signup failed', { status: 400 });
			}

			console.error('Signup error:', err);
			return message(form, 'An unexpected error occurred. Please try again.', { status: 500 });
		}

		redirect(303, `/auth/email-verification?email=${encodeURIComponent(email)}`);
	}
};
