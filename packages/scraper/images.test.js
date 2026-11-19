import { describe, expect, it } from 'vitest';
import { imageSource, planImages } from './images.js';

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
