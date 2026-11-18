import { error } from '@sveltejs/kit';
import { AwsClient } from 'aws4fetch';
import { eq } from 'drizzle-orm';
import { user as userTable } from '@app/db/schema';
import { db } from '#lib/server/db.js';
import { cached } from '#lib/server/cache.js';
import { R2_ACCESS_KEY_ID, R2_BUCKET, R2_ENDPOINT, R2_SECRET_ACCESS_KEY } from '$app/env/private';

/** How long a role change can take to apply on a server instance. */
const ROLE_TTL_MS = 60 * 1000;

/**
 * Whether the user is an admin. The role stays out of the session (so it never
 * reaches the browser), so this reads it from the database, cached per user so a
 * logged-in visitor doesn't cost a query on every page.
 */
export async function isAdmin(user: { id: string } | null | undefined): Promise<boolean> {
	if (!user) return false;
	const [row] = await cached(`role:${user.id}`, ROLE_TTL_MS, () =>
		db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, user.id)).limit(1)
	);
	return row?.role === 'admin';
}

/**
 * Admin pages answer 404 to everyone else, so they don't advertise themselves.
 * Call it in every load and action: a layout's load doesn't guard actions.
 */
export async function requireAdmin(locals: App.Locals) {
	if (!(await isAdmin(locals.user))) error(404, 'Not found');
	return locals.user!;
}

/** Must match IMAGE_WIDTHS in packages/scraper/images.js. */
export const IMAGE_WIDTHS = [400, 800] as const;

export function imageBucket() {
	if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
	const client = new AwsClient({
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
		service: 's3',
		region: 'auto'
	});
	const base = `${R2_ENDPOINT.replace(/\/$/, '')}/${R2_BUCKET}`;

	return {
		async put(name: string, body: ArrayBuffer) {
			const response = await client.fetch(`${base}/${name}`, {
				method: 'PUT',
				body,
				headers: {
					'Content-Type': 'image/webp',
					// Named by content, so a file never changes.
					'Cache-Control': 'public, max-age=31536000, immutable'
				}
			});
			if (!response.ok) throw new Error(`upload responded ${response.status}`);
		}
	};
}

/** Hex SHA-256, available in Node and on Workers alike. */
export async function contentHash(body: ArrayBuffer) {
	const digest = await crypto.subtle.digest('SHA-256', body);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
