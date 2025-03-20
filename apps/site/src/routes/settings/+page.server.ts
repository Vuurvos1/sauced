import { redirect } from '@sveltejs/kit';

export async function load({ locals: { user } }) {
	if (!user) {
		redirect(302, '/');
	}
}
