import { requireAdmin } from '#lib/server/admin.js';

export async function load({ locals }) {
	await requireAdmin(locals);
}
