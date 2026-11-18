import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { IMAGE_WIDTHS, imageSource, perceptualHash, planImages, uploadImage } from './images.js';

/** @param {{ exists?: boolean }} [options] */
function fakeBucket({ exists = false } = {}) {
	/** @type {{ url: string, method: string, headers: Record<string, string>, body?: Buffer }[]} */
	const requests = [];
	const client = {
		/** @param {string} url @param {RequestInit} init */
		fetch: async (url, init) => {
			requests.push({
				url,
				method: init.method ?? 'GET',
				headers: /** @type {Record<string, string>} */ (init.headers ?? {}),
				body: /** @type {Buffer | undefined} */ (init.body)
			});
			return new Response(null, { status: init.method === 'HEAD' && !exists ? 404 : 200 });
		}
	};
	return { bucket: { client: /** @type {any} */ (client), base: 'https://r2.test/b' }, requests };
}

async function serveImage() {
	const png = await sharp({
		create: { width: 1200, height: 600, channels: 3, background: '#c00' }
	})
		.png()
		.toBuffer();
	vi.stubGlobal('fetch', async () => new Response(png, { status: 200 }));
}

afterEach(() => vi.unstubAllGlobals());

describe('uploadImage', () => {
	it('uploads each width as immutable WebP, never wider than asked', async () => {
		await serveImage();
		const { bucket, requests } = fakeBucket();

		const { key, phash } = await uploadImage(bucket, 'https://shop.test/a.png');
		expect(phash).toMatch(/^[0-9a-f]{64}$/);

		expect(key).toMatch(/^sauces\/v1\/[0-9a-f]{32}$/);
		const puts = requests.filter((r) => r.method === 'PUT');
		expect(puts.map((r) => r.url)).toEqual(
			IMAGE_WIDTHS.map((w) => `https://r2.test/b/${key}-${w}.webp`)
		);
		for (const [i, put] of puts.entries()) {
			expect(put.headers['Cache-Control']).toContain('immutable');
			const meta = await sharp(put.body).metadata();
			expect(meta.format).toBe('webp');
			expect(meta.width).toBe(IMAGE_WIDTHS[i]);
		}
	});

	it('skips the upload when the set already exists', async () => {
		await serveImage();
		const { bucket, requests } = fakeBucket({ exists: true });

		await uploadImage(bucket, 'https://shop.test/a.png');

		expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0);
	});

	it('rejects when the shop refuses the image', async () => {
		vi.stubGlobal('fetch', async () => new Response(null, { status: 403 }));
		const { bucket } = fakeBucket();

		await expect(uploadImage(bucket, 'https://shop.test/a.png')).rejects.toThrow('403');
	});
});

describe('imageSource', () => {
	it('tells Shopify stores apart on their shared CDN', () => {
		expect(imageSource('https://cdn.shopify.com/s/files/1/0645/7913/files/a.jpg?v=1')).toBe(
			'cdn.shopify.com/s/files/1/0645/7913'
		);
		expect(imageSource('https://www.heatsupply.nl/wp-content/uploads/a.jpg')).toBe(
			'www.heatsupply.nl'
		);
	});
});

describe('planImages', () => {
	const a = 'https://cdn.shopify.com/s/files/1/0645/7913/files';
	const b = 'https://www.heatsupply.nl/wp-content/uploads';
	/** @param {string} id @param {string | null} storeId @param {string} sourceUrl @param {number} position */
	const row = (id, storeId, sourceUrl, position) => ({ id, storeId, sourceUrl, position });

	it("orders a new sauce's photos shop by shop", () => {
		const plan = planImages(
			[],
			new Map([
				['A', [`${a}/1.jpg`, `${a}/2.jpg`]],
				['B', [`${b}/1.jpg`]]
			])
		);
		expect(plan.inserts).toEqual([
			{ storeId: 'A', sourceUrl: `${a}/1.jpg`, position: 0 },
			{ storeId: 'A', sourceUrl: `${a}/2.jpg`, position: 1 },
			{ storeId: 'B', sourceUrl: `${b}/1.jpg`, position: 2 }
		]);
	});

	it('keeps the main image with its shop when the shop swaps the photo', () => {
		const plan = planImages(
			[row('1', 'A', `${a}/old.jpg`, 0), row('2', 'B', `${b}/1.jpg`, 1)],
			new Map([['A', [`${a}/new.jpg`]]])
		);
		expect(plan.deletes).toEqual(['1']);
		expect(plan.inserts).toEqual([{ storeId: 'A', sourceUrl: `${a}/new.jpg`, position: 0 }]);
	});

	it("leaves shops that weren't scraped alone", () => {
		const plan = planImages([row('1', 'A', `${a}/1.jpg`, 0)], new Map([['B', [`${b}/1.jpg`]]]));
		expect(plan.deletes).toEqual([]);
		expect(plan.inserts).toEqual([{ storeId: 'B', sourceUrl: `${b}/1.jpg`, position: 1 }]);
	});

	it('gives a carried-over photo to the shop that serves it', () => {
		const plan = planImages(
			[row('1', null, `${a}/1.jpg`, 0), row('2', null, `${a}/gone.jpg`, 1)],
			new Map([['A', [`${a}/1.jpg`, `${a}/2.jpg`]]])
		);
		expect(plan.adopted).toEqual([{ id: '1', storeId: 'A' }]);
		expect(plan.deletes).toEqual(['2']);
		expect(plan.inserts).toEqual([{ storeId: 'A', sourceUrl: `${a}/2.jpg`, position: 1 }]);
	});

	it('does nothing when the photos are unchanged', () => {
		const plan = planImages([row('1', 'A', `${a}/1.jpg`, 0)], new Map([['A', [`${a}/1.jpg`]]]));
		expect(plan).toEqual({ inserts: [], deletes: [], adopted: [] });
	});
});

describe('perceptualHash', () => {
	/** @param {string} a @param {string} b */
	const distance = (a, b) =>
		[...(BigInt(`0x${a}`) ^ BigInt(`0x${b}`)).toString(2)].filter((bit) => bit === '1').length;

	/**
	 * A textured stand-in for a photo: flat shapes hash to nearly all zero bits,
	 * because dHash only sees brightness changing between neighbours.
	 *
	 * @param {(x: number, y: number) => number} shade 0–255 at each point of the unit square
	 */
	function photo(shade, size = 600) {
		const pixels = Buffer.alloc(size * size * 3);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const v = Math.max(0, Math.min(255, Math.round(shade(x / size, y / size))));
				pixels.fill(v, (y * size + x) * 3, (y * size + x) * 3 + 3);
			}
		}
		return sharp(pixels, { raw: { width: size, height: size, channels: 3 } });
	}
	const bottleShot = (/** @type {number} */ x, /** @type {number} */ y) =>
		128 + 90 * Math.sin(x * 9 + y * 4) * Math.cos(y * 7 - x * 3);
	const otherShot = (/** @type {number} */ x, /** @type {number} */ y) =>
		128 + 90 * Math.cos(x * 5 - y * 11) * Math.sin(x * 13);

	it("lands a shop's resized, recompressed, padded copy a few bits away", async () => {
		const original = await perceptualHash(await photo(bottleShot).png().toBuffer());
		const copy = await perceptualHash(
			await photo(bottleShot)
				.resize(400)
				.extend({ top: 80, bottom: 80, left: 80, right: 80, background: '#ffffff' })
				.jpeg({ quality: 55 })
				.toBuffer()
		);
		expect(distance(original, copy)).toBeLessThanOrEqual(20);
	});

	it('keeps a different photo far away', async () => {
		const original = await perceptualHash(await photo(bottleShot).png().toBuffer());
		const other = await perceptualHash(await photo(otherShot).png().toBuffer());
		expect(distance(original, other)).toBeGreaterThan(60);
	});
});
