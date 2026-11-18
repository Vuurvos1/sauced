import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { hotSauceImages, hotSauces, stores } from '@app/db/schema';
import { db } from '#lib/server/db.js';
import { imageBucket } from '#lib/server/admin.js';
import { imageOrder, isSamePhoto, shownImageKey } from '#lib/server/images.js';

/**
 * Everything the photo editor shows for one sauce: every photo, hidden and pending
 * ones included, flagged the way visitors would experience them.
 */
export async function loadSauceEditor(sauceId: string) {
	const rows = await db
		.select({
			imageId: hotSauceImages.imageId,
			imageKey: shownImageKey,
			originalKey: hotSauceImages.imageKey,
			imageUrl: hotSauceImages.sourceUrl,
			phash: hotSauceImages.phash,
			hidden: hotSauceImages.hidden,
			pinned: hotSauceImages.pinned,
			pending: hotSauceImages.pending,
			edits: hotSauceImages.edits,
			storeName: stores.name
		})
		.from(hotSauceImages)
		.leftJoin(stores, eq(stores.storeId, hotSauceImages.storeId))
		.where(eq(hotSauceImages.sauceId, sauceId))
		.orderBy(...imageOrder);

	// Mirror what visitors get: the first visible photo is the main image, and a
	// later copy of a visible photo is left out of the gallery.
	const shown: (typeof rows)[number][] = [];
	const images = rows.map(({ phash, ...row }) => {
		const visible = !row.hidden && !row.pending;
		const duplicate = visible && shown.some((other) => isSamePhoto(other.phash, phash));
		if (visible && !duplicate) shown.push({ phash, ...row });
		return { ...row, duplicate, main: shown[0]?.imageId === row.imageId };
	});

	return { images, canEdit: imageBucket() !== null };
}

export type SauceEditorImage = Awaited<ReturnType<typeof loadSauceEditor>>['images'][number];

/**
 * The unreviewed sauce after this one in the review list's order (newest first),
 * wrapping round to the start.
 */
export async function nextToReview(sauce: { sauceId: string; createdAt: Date }) {
	const after = or(
		lt(hotSauces.createdAt, sauce.createdAt),
		and(eq(hotSauces.createdAt, sauce.createdAt), sql`${hotSauces.sauceId} > ${sauce.sauceId}`)
	);
	const toReview = and(isNull(hotSauces.reviewedAt), isNull(hotSauces.hiddenAt));
	for (const where of [and(toReview, after), toReview]) {
		const [next] = await db
			.select({ slug: hotSauces.slug })
			.from(hotSauces)
			.where(and(where, sql`${hotSauces.sauceId} <> ${sauce.sauceId}`))
			.orderBy(desc(hotSauces.createdAt), hotSauces.sauceId)
			.limit(1);
		if (next) return next.slug;
	}
	return null;
}
