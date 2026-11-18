import { error } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { eq } from 'drizzle-orm';
import { hotSauceImages } from '@app/db/schema';
import { sauceImageSrc } from '#lib/images.js';
import { db } from '#lib/server/db.js';
import { requireAdmin } from '#lib/server/admin.js';

/**
 * The unedited photo, served from the site's own origin: the editor paints on a
 * canvas, and a canvas holding a cross-origin image can't be exported.
 */
export async function GET({ locals, params }) {
	await requireAdmin(locals);
	if (!z.uuid().safeParse(params.id).success) error(404, 'Not found');

	const [image] = await db
		.select({ imageKey: hotSauceImages.imageKey, sourceUrl: hotSauceImages.sourceUrl })
		.from(hotSauceImages)
		.where(eq(hotSauceImages.imageId, params.id))
		.limit(1);
	if (!image) error(404, 'Not found');

	const response = await fetch(
		sauceImageSrc({ imageKey: image.imageKey, imageUrl: image.sourceUrl }, 800)!
	);
	if (!response.ok) error(502, `The photo responded ${response.status}`);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('content-type') ?? 'image/webp',
			'Cache-Control': 'private, max-age=3600'
		}
	});
}
