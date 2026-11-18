import { hotSauceImages, hotSauces } from '@app/db/schema';
import { type AnyColumn, sql } from 'drizzle-orm';

/**
 * One column of a sauce's main image: its lowest-position photo that made it to
 * the bucket, so a shop's dead link doesn't become the face of the sauce. Both
 * columns order the same way and so always describe the same row.
 */
function mainImageColumn(column: AnyColumn) {
	return sql<string | null>`(
		select ${column} from ${hotSauceImages}
		where ${hotSauceImages.sauceId} = ${hotSauces.sauceId}
		order by ${hotSauceImages.imageKey} is null, ${hotSauceImages.position}, ${hotSauceImages.imageId}
		limit 1
	)`;
}

/** Spread into a select on `hotSauces` to get what `sauceImageAttrs` needs. */
export const mainImage = {
	imageKey: mainImageColumn(hotSauceImages.imageKey),
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

/**
 * Keeps the first of each set of near-identical photos, so a bottle shot two shops
 * both use appears once. Order is kept, so the main image always survives.
 */
export function withoutDuplicatePhotos<T extends { phash: string | null }>(images: T[]): T[] {
	const kept: T[] = [];
	for (const image of images) {
		const { phash } = image;
		const duplicate =
			phash !== null &&
			kept.some(
				(other) =>
					other.phash !== null &&
					other.phash.length === phash.length &&
					differingBits(other.phash, phash) <= SAME_PHOTO_BITS
			);
		if (!duplicate) kept.push(image);
	}
	return kept;
}
