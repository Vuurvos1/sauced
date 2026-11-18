import { eq } from 'drizzle-orm';
import { hotSauceImages, stores } from '@app/db/schema';
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
