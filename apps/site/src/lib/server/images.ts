import { hotSauceImages, hotSauces } from '@app/db/schema';
import { and, desc, eq, type SQL, sql } from 'drizzle-orm';

/** The file to show: the admin's edited copy when there is one. */
export const shownImageKey = sql<
	string | null
>`coalesce(${hotSauceImages.editedKey}, ${hotSauceImages.imageKey})`;

/** What visitors may see: not rejected, and not waiting for an admin. */
export const visibleImage = and(
	eq(hotSauceImages.hidden, false),
	eq(hotSauceImages.pending, false)
);

/**
 * Gallery order: the admin's pick first, then photos that made it to the bucket,
 * so a shop's dead link doesn't become the face of the sauce, then the shops' order.
 */
export const imageOrder = [
	desc(hotSauceImages.pinned),
	sql`${shownImageKey} is null`,
	hotSauceImages.position,
	hotSauceImages.imageId
];

/** One column of a sauce's main image. Both columns pick the same row. */
function mainImageColumn(column: SQL | typeof hotSauceImages.sourceUrl) {
	return sql<string | null>`(
		select ${column} from ${hotSauceImages}
		where ${hotSauceImages.sauceId} = ${hotSauces.sauceId} and ${visibleImage}
		order by ${sql.join(imageOrder, sql`, `)}
		limit 1
	)`;
}

/** Spread into a select on `hotSauces` to get what `sauceImageAttrs` needs. */
export const mainImage = {
	imageKey: mainImageColumn(shownImageKey),
	imageUrl: mainImageColumn(hotSauceImages.sourceUrl)
};

/**
 * Bits two fingerprints may differ by and still be one photo. Measured on product
 * shots: shops' copies of one photo stayed within 20 of 256, while the front and
 * back of one bottle started at 26. See `perceptualHash` in the scraper.
 */
const SAME_PHOTO_BITS = 20;

function differingBits(a: string, b: string) {
	let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
	let count = 0;
	while (x) {
		x &= x - 1n;
		count++;
	}
	return count;
}

/** Whether two fingerprints are the same photo, saved twice or by two shops. */
export function isSamePhoto(a: string | null, b: string | null) {
	return (
		a !== null && b !== null && a.length === b.length && differingBits(a, b) <= SAME_PHOTO_BITS
	);
}

/**
 * Keeps the first of each set of near-identical photos, so a bottle shot two shops
 * both use appears once. Order is kept, so the main image always survives.
 */
export function withoutDuplicatePhotos<T extends { phash: string | null }>(images: T[]): T[] {
	const kept: T[] = [];
	for (const image of images) {
		if (!kept.some((other) => isSamePhoto(other.phash, image.phash))) kept.push(image);
	}
	return kept;
}
