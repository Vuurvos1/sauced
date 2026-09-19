import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { emailSchema, loginPasswordSchema } from '$lib/validation';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

const loginSchema = z.object({
	email: emailSchema,
	password: loginPasswordSchema
});

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}

	const form = await superValidate(zod4(loginSchema));

	return { form };
};

export const actions: Actions = {
	login: async ({ request }) => {
		const form = await superValidate(request, zod4(loginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { email, password } = form.data;

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers
			});
		} catch (err) {
			if (err instanceof APIError) {
				if (err.body?.code === 'EMAIL_NOT_VERIFIED') {
					return message(form, 'You must verify your email before logging in.', {
						status: 400
					});
				}
				return message(form, err.body?.message ?? 'Incorrect email or password', {
					status: 400
				});
			}
			console.error('Login error:', err);
			return message(form, 'An unexpected error occurred.', { status: 500 });
		}

		return redirect(302, '/');
	}
};
