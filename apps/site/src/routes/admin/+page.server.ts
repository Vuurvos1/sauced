import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/admin.js';

export async function load({ locals }) {
	await requireAdmin(locals);
	redirect(307, '/admin/review');
}
