import { error } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { eq } from 'drizzle-orm';
import { hotSauceImages } from '@app/db/schema';
import { PUBLIC_IMAGE_BASE_URL } from '$app/env/public';
import { db } from '#lib/server/db.js';
import { requireAdmin } from '#lib/server/admin.js';

/**
 * The unedited photo, served from the site's own origin: the editor paints on a
 * canvas, and a canvas holding a cross-origin image can't be exported.
 */
export async function GET({ locals, params }) {
	requireAdmin(locals);
	if (!z.uuid().safeParse(params.id).success) error(404, 'Not found');

	const [image] = await db
		.select({ imageKey: hotSauceImages.imageKey, sourceUrl: hotSauceImages.sourceUrl })
		.from(hotSauceImages)
		.where(eq(hotSauceImages.imageId, params.id))
		.limit(1);
	if (!image) error(404, 'Not found');

	const url =
		image.imageKey && PUBLIC_IMAGE_BASE_URL
			? `${PUBLIC_IMAGE_BASE_URL}/${image.imageKey}-800.webp`
			: image.sourceUrl;
	const response = await fetch(url);
	if (!response.ok) error(502, `The photo responded ${response.status}`);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('content-type') ?? 'image/webp',
			'Cache-Control': 'private, max-age=3600'
		}
	});
}
