import { createHash } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import sharp from 'sharp';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { hotSauceImages } from '@app/db/schema';
import { fetchPage, sleep } from './utils/fetch.js';

/** Grid thumbnails and the detail page; the site picks between them with srcset. */
export const IMAGE_WIDTHS = [400, 800];

/**
 * Part of every key, because keys are cached as immutable: changing the widths or
 * encoding must produce new URLs. Bump it, then null `image_key` to re-upload.
 */
const PIPELINE_VERSION = 'v1';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Shops downloaded from at once; each shop's own images go one at a time. */
const CONCURRENCY = 4;

/** Rows per statement, well under Postgres' bind-parameter ceiling. */
const WRITE_CHUNK = 1000;

/**
 * Between two images from one shop. Four parallel downloads per shop got three
 * Shopify stores answering 403 to every image, ones that had loaded minutes before.
 */
const SHOP_DELAY_MS = 500;

/**
 * Which shop serves an image. Shopify stores share cdn.shopify.com, but each has
 * its own `/s/files/1/<id>/<id>` path, and limits are applied per store.
 *
 * @param {string} url
 */
export function imageSource(url) {
	const { host, pathname } = new URL(url);
	if (host !== 'cdn.shopify.com') return host;
	return `${host}${pathname.split('/').slice(0, 6).join('/')}`;
}

/**
 * @typedef {{ client: AwsClient, base: string }} ImageBucket
 */

/**
 * `R2_ENDPOINT` overrides the account's R2 endpoint with any S3-compatible server,
 * such as the `s3` service in docker-compose.yaml.
 *
 * @returns {ImageBucket | null} null when R2 isn't configured, e.g. a local scrape
 */
export function imageBucketFromEnv() {
	const { R2_ACCOUNT_ID, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
		process.env;
	const endpoint =
		R2_ENDPOINT || (R2_ACCOUNT_ID && `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
	if (!endpoint || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;

	return {
		client: new AwsClient({
			accessKeyId: R2_ACCESS_KEY_ID,
			secretAccessKey: R2_SECRET_ACCESS_KEY,
			service: 's3',
			region: 'auto'
		}),
		base: `${endpoint.replace(/\/$/, '')}/${R2_BUCKET}`
	};
}

/**
 * @param {string} key
 * @param {number} width
 */
export function imageObjectName(key, width) {
	return `${key}-${width}.webp`;
}

/** @param {string} url */
function shopOf(url) {
	try {
		return imageSource(url);
	} catch {
		return null;
	}
}

/**
 * @typedef {{ id: string, storeId: string | null, sourceUrl: string, position: number }} StoredImage
 * @typedef {{
 *   inserts: { storeId: string, sourceUrl: string, position: number }[],
 *   deletes: string[],
 *   adopted: { id: string, storeId: string }[]
 * }} ImagePlan
 */

/**
 * Works out how one sauce's photos change, given the photos each shop in this run
 * lists for it. Shops not in the run keep theirs, so a `--dev` sample changes
 * nothing it didn't scrape.
 *
 * A shop's dropped photos free their positions, and its new photos take those
 * first: when the main image's shop swaps its photo, the replacement is still the
 * main image instead of another shop's picture moving up.
 *
 * @param {StoredImage[]} stored
 * @param {Map<string, string[]>} listed store id -> image URLs, in the shop's order
 * @returns {ImagePlan}
 */
export function planImages(stored, listed) {
	/** @type {ImagePlan} */
	const plan = { inserts: [], deletes: [], adopted: [] };
	let rows = [...stored];

	for (const [storeId, urls] of listed) {
		// Rows carried over without a shop belong to whichever shop serves them.
		const shops = new Set(urls.map(shopOf));
		const own = rows.filter(
			(row) => row.storeId === storeId || (row.storeId === null && shops.has(shopOf(row.sourceUrl)))
		);
		const dropped = own.filter((row) => !urls.includes(row.sourceUrl));

		for (const row of own) {
			if (row.storeId === null && urls.includes(row.sourceUrl)) {
				plan.adopted.push({ id: row.id, storeId });
			}
		}
		plan.deletes.push(...dropped.map((row) => row.id));
		rows = rows.filter((row) => !dropped.includes(row));

		const freed = dropped.map((row) => row.position).sort((a, b) => a - b);
		for (const sourceUrl of urls) {
			// Another shop may already hold the same URL; it stays theirs.
			if (rows.some((row) => row.sourceUrl === sourceUrl)) continue;
			const position =
				freed.shift() ?? rows.reduce((max, row) => Math.max(max, row.position + 1), 0);
			plan.inserts.push({ storeId, sourceUrl, position });
			rows.push({ id: '', storeId, sourceUrl, position });
		}
	}

	return plan;
}

/**
 * Applies `planImages` to every sauce in the run.
 *
 * @param {ReturnType<typeof import('@app/db').getDb>} db
 * @param {Map<string, Map<string, string[]>>} listedBySauce sauce id -> store id -> URLs
 */
export async function writeSauceImages(db, listedBySauce) {
	const sauceIds = [...listedBySauce.keys()];
	/** @type {Map<string, StoredImage[]>} */
	const storedBySauce = new Map();
	for (let start = 0; start < sauceIds.length; start += WRITE_CHUNK) {
		const rows = await db
			.select({
				id: hotSauceImages.imageId,
				sauceId: hotSauceImages.sauceId,
				storeId: hotSauceImages.storeId,
				sourceUrl: hotSauceImages.sourceUrl,
				position: hotSauceImages.position
			})
			.from(hotSauceImages)
			.where(inArray(hotSauceImages.sauceId, sauceIds.slice(start, start + WRITE_CHUNK)));
		for (const { sauceId, ...row } of rows) {
			if (!storedBySauce.has(sauceId)) storedBySauce.set(sauceId, []);
			storedBySauce.get(sauceId)?.push(row);
		}
	}

	/** @type {import('@app/db/types').HotSauceImageInsert[]} */
	const inserts = [];
	/** @type {string[]} */
	const deletes = [];
	/** @type {{ id: string, storeId: string }[]} */
	const adopted = [];
	for (const [sauceId, listed] of listedBySauce) {
		const plan = planImages(storedBySauce.get(sauceId) ?? [], listed);
		inserts.push(...plan.inserts.map((row) => ({ ...row, sauceId })));
		deletes.push(...plan.deletes);
		adopted.push(...plan.adopted);
	}

	// Deletes first: a re-listed URL would otherwise collide with its old row.
	for (let start = 0; start < deletes.length; start += WRITE_CHUNK) {
		await db
			.delete(hotSauceImages)
			.where(inArray(hotSauceImages.imageId, deletes.slice(start, start + WRITE_CHUNK)));
	}
	for (const { id, storeId } of adopted) {
		await db.update(hotSauceImages).set({ storeId }).where(eq(hotSauceImages.imageId, id));
	}
	for (let start = 0; start < inserts.length; start += WRITE_CHUNK) {
		await db
			.insert(hotSauceImages)
			.values(inserts.slice(start, start + WRITE_CHUNK))
			.onConflictDoNothing();
	}

	console.info('Images:', inserts.length, 'new,', deletes.length, 'dropped by their shop');
}

/**
 * A 256-bit difference hash, as 64 hex digits: each bit says whether a pixel of a
 * 17×16 greyscale thumbnail is brighter than its right-hand neighbour. Re-encoding,
 * resizing and recompression barely move it.
 *
 * 256 bits, not the usual 64: at 9×8 a bottle on white is all silhouette, and the
 * front and back of one bottle landed as close as two shops' copies of one photo.
 * At 17×16 the label shows, and on 195 such pairs copies stayed within 20 bits
 * while front/back pairs started at 26.
 *
 * The plain border is trimmed first: shops pad the same shot by different amounts,
 * which shifts everything the hash looks at.
 *
 * @param {Buffer} image
 * @returns {Promise<string>}
 */
export async function perceptualHash(image) {
	const SIZE = 16;
	const pixels = async (/** @type {boolean} */ trim) => {
		const input = trim
			? await sharp(image).flatten({ background: '#ffffff' }).trim({ threshold: 10 }).toBuffer()
			: image;
		return sharp(input)
			.flatten({ background: '#ffffff' })
			.grayscale()
			.resize(SIZE + 1, SIZE, { fit: 'fill' })
			.raw()
			.toBuffer();
	};
	// Trimming throws on an image that is all border.
	const raw = await pixels(true).catch(() => pixels(false));

	let hex = '';
	for (let row = 0; row < SIZE; row++) {
		for (let col = 0; col < SIZE; col += 4) {
			let nibble = 0;
			for (let bit = 0; bit < 4; bit++) {
				const i = row * (SIZE + 1) + col + bit;
				nibble = (nibble << 1) | (raw[i] > raw[i + 1] ? 1 : 0);
			}
			hex += nibble.toString(16);
		}
	}
	return hex;
}

/**
 * Downloads, resizes and uploads one image.
 *
 * Keyed on the source bytes, so sauces sharing a photo share the objects and a
 * re-run skips anything already uploaded.
 *
 * @param {ImageBucket} bucket
 * @param {string} sourceUrl
 * @returns {Promise<{ key: string, phash: string }>}
 */
export async function uploadImage(bucket, sourceUrl) {
	const response = await fetchPage(sourceUrl, { headers: { Accept: 'image/*' } });
	if (!response.ok) throw new Error(`responded ${response.status}`);
	const source = Buffer.from(await response.arrayBuffer());

	const hash = createHash('sha256').update(source).digest('hex').slice(0, 32);
	const key = `sauces/${PIPELINE_VERSION}/${hash}`;

	const variants = await Promise.all(
		IMAGE_WIDTHS.map((width) =>
			sharp(source)
				.rotate()
				.resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 80 })
				.toBuffer()
		)
	);
	// From the smallest copy, the same file `fingerprintImages` reads back later.
	const phash = await perceptualHash(variants[0]);

	// The largest width is uploaded last, so its presence means the set is complete.
	const largest = imageObjectName(key, IMAGE_WIDTHS.at(-1));
	const head = await bucket.client.fetch(`${bucket.base}/${largest}`, { method: 'HEAD' });
	if (head.ok) return { key, phash };

	for (const [i, width] of IMAGE_WIDTHS.entries()) {
		const body = variants[i];
		const put = await bucket.client.fetch(`${bucket.base}/${imageObjectName(key, width)}`, {
			method: 'PUT',
			body,
			headers: { 'Content-Type': 'image/webp', 'Cache-Control': CACHE_CONTROL }
		});
		if (!put.ok) throw new Error(`upload responded ${put.status}`);
	}

	return { key, phash };
}

/**
 * Fingerprints images uploaded before fingerprints existed, from the bucket's own
 * copy rather than the shop's, so it costs the shops nothing.
 *
 * @param {ReturnType<typeof import('@app/db').getDb>} db
 * @param {ImageBucket} bucket
 */
async function fingerprintImages(db, bucket) {
	const pending = await db
		.select({ id: hotSauceImages.imageId, imageKey: hotSauceImages.imageKey })
		.from(hotSauceImages)
		.where(and(isNotNull(hotSauceImages.imageKey), isNull(hotSauceImages.phash)));
	if (pending.length === 0) return;

	console.info('Fingerprinting', pending.length, 'uploaded images');
	let next = 0;
	async function worker() {
		while (next < pending.length) {
			const image = pending[next++];
			const name = imageObjectName(/** @type {string} */ (image.imageKey), IMAGE_WIDTHS[0]);
			const response = await bucket.client.fetch(`${bucket.base}/${name}`);
			if (!response.ok) {
				console.warn('Fingerprint failed:', name, response.status);
				continue;
			}
			const phash = await perceptualHash(Buffer.from(await response.arrayBuffer()));
			await db.update(hotSauceImages).set({ phash }).where(eq(hotSauceImages.imageId, image.id));
		}
	}
	await Promise.all(Array.from({ length: 8 }, worker));
}

/**
 * Uploads every sauce image not yet in R2. Doubles as the backfill: it works from
 * the table, not from the current scrape.
 *
 * An image that fails stays null and is retried next run. It never fails the run:
 * the site falls back to the shop's own URL.
 *
 * @param {ReturnType<typeof import('@app/db').getDb>} db
 * @param {ImageBucket} bucket
 * @returns {Promise<{ uploaded: number, failed: number }>}
 */
export async function syncImages(db, bucket) {
	await fingerprintImages(db, bucket);

	const pending = await db
		.select({ id: hotSauceImages.imageId, sourceUrl: hotSauceImages.sourceUrl })
		.from(hotSauceImages)
		.where(isNull(hotSauceImages.imageKey));

	console.info('Uploading', pending.length, 'images');

	/** @type {Map<string, typeof pending>} */
	const byShop = new Map();
	for (const image of pending) {
		const shop = shopOf(image.sourceUrl) ?? image.sourceUrl;
		if (!byShop.has(shop)) byShop.set(shop, []);
		byShop.get(shop)?.push(image);
	}
	// Largest first, so the long queues start early and the run ends evenly.
	const queues = [...byShop.values()].sort((a, b) => b.length - a.length);

	let uploaded = 0;
	let failed = 0;

	async function worker() {
		for (let queue = queues.shift(); queue; queue = queues.shift()) {
			for (const [i, image] of queue.entries()) {
				if (i > 0) await sleep(SHOP_DELAY_MS);
				try {
					const { key: imageKey, phash } = await uploadImage(bucket, image.sourceUrl);
					await db
						.update(hotSauceImages)
						.set({ imageKey, phash })
						.where(eq(hotSauceImages.imageId, image.id));
					uploaded++;
				} catch (error) {
					failed++;
					console.warn('Image failed:', image.sourceUrl, /** @type {Error} */ (error).message);
				}
			}
		}
	}

	await Promise.all(Array.from({ length: CONCURRENCY }, worker));

	console.info('Uploaded', uploaded, 'images;', failed, 'failed');
	return { uploaded, failed };
}
