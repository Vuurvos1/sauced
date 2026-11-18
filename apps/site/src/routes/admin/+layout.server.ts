import { requireAdmin } from '#lib/server/admin.js';

export function load({ locals }) {
	requireAdmin(locals);
}
