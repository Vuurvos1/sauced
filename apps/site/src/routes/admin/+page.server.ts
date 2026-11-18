import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/admin.js';

export function load({ locals }) {
	requireAdmin(locals);
	redirect(307, '/admin/review');
}
