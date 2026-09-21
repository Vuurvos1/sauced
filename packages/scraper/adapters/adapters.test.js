import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import { getCachePath, writeFile } from '../utils/index.js';
import { createShopifyScraper } from './shopify.js';
import { createWooScraper } from './woo.js';

/**
 * Seeding the cache exercises the real pagination and mapping path without
 * touching the network.
 */
const options = { cache: true, dbInsert: false, dev: false };

const SHOPIFY_KEY = '__test_shopify';
const WOO_KEY = '__test_woo';

/**
 * @param {string} key
 * @param {string} url
 * @param {unknown} payload
 */
function seed(key, url, payload) {
	writeFile(getCachePath(key, url, 'json'), JSON.stringify(payload));
}

/**
 * @param {import('../').SauceScraper} scraper
 */
async function scrapeAll(scraper) {
	const urls = await scraper.getSauceUrls(scraper.url, options);
	const sauces = [];
	for (const url of urls) {
		const sauce = await scraper.scrapeSauce(url, options);
		if (sauce) sauces.push(sauce);
	}
	return sauces;
}

afterAll(() => {
	fs.rmSync(`./cache/${SHOPIFY_KEY}`, { recursive: true, force: true });
	fs.rmSync(`./cache/${WOO_KEY}`, { recursive: true, force: true });
});

describe('createShopifyScraper', () => {
	const url = 'https://shop.test';

	seed(SHOPIFY_KEY, `${url}/products.json?limit=250&page=1`, {
		products: [
			{
				title: 'Ghost Pepper Sauce',
				handle: 'ghost-pepper',
				body_html: '<p>Smoky &amp; hot</p>',
				vendor: 'Test Maker',
				images: [{ src: 'https://cdn.test/ghost.png' }]
			},
			{ title: 'Hot Sauce Giftpack', handle: 'giftpack', vendor: 'Test Maker', images: [] },
			{ title: 'House Blend', handle: 'house', vendor: 'Mijn winkel', images: [] },
			{ title: 'Salty Crisps', handle: 'crisps', vendor: 'Snack Co', images: [] }
		]
	});

	it('maps a product onto a sauce', async () => {
		const scraper = createShopifyScraper({ key: SHOPIFY_KEY, name: 'Test Shop', url });
		const [sauce] = await scrapeAll(scraper);

		expect(sauce).toEqual({
			name: 'Ghost Pepper Sauce',
			slug: 'ghost-pepper-sauce',
			description: 'Smoky & hot',
			url: 'https://shop.test/products/ghost-pepper',
			imageUrl: 'https://cdn.test/ghost.png',
			maker: 'Test Maker'
		});
	});

	it('drops bundles', async () => {
		const scraper = createShopifyScraper({ key: SHOPIFY_KEY, name: 'Test Shop', url });
		const sauces = await scrapeAll(scraper);

		expect(sauces.map((s) => s.name)).not.toContain('Hot Sauce Giftpack');
	});

	// A retailer must not be credited with making what it only sells, so the
	// fallback is opt-in: no houseBrand means the maker stays unknown.
	it('leaves the maker unknown for a placeholder vendor', async () => {
		const scraper = createShopifyScraper({ key: SHOPIFY_KEY, name: 'Test Shop', url });
		const sauces = await scrapeAll(scraper);

		expect(sauces.find((s) => s.name === 'House Blend')?.maker).toBeNull();
	});

	it('uses houseBrand when the shop makes its own sauce', async () => {
		const scraper = createShopifyScraper({
			key: SHOPIFY_KEY,
			name: 'Test Shop',
			url,
			houseBrand: 'Test Shop'
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces.find((s) => s.name === 'House Blend')?.maker).toBe('Test Shop');
	});

	it('renames a brand the feed spells oddly', async () => {
		const scraper = createShopifyScraper({
			key: SHOPIFY_KEY,
			name: 'Test Shop',
			url,
			renameMakers: { 'Test Maker': 'Test Maker Co.' }
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces.find((s) => s.name === 'Ghost Pepper Sauce')?.maker).toBe('Test Maker Co.');
	});

	it('honours excludeVendors', async () => {
		const scraper = createShopifyScraper({
			key: SHOPIFY_KEY,
			name: 'Test Shop',
			url,
			excludeVendors: ['Snack Co']
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces.map((s) => s.name)).not.toContain('Salty Crisps');
	});

	it('strips a brand suffix when the store bakes one into the title', async () => {
		const scraper = createShopifyScraper({
			key: SHOPIFY_KEY,
			name: 'Test Shop',
			url,
			stripFromName: /\s*\|[\s\S]*$/
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces[0].name).toBe('Ghost Pepper Sauce');
	});
});

describe('createWooScraper', () => {
	const url = 'https://woo.test';

	seed(WOO_KEY, `${url}/wp-json/wc/store/v1/products?per_page=100&page=1`, [
		{
			name: 'De Sambal &#8211; Per de Man',
			slug: 'de-sambal',
			parent: 0,
			permalink: 'https://woo.test/product/de-sambal/',
			short_description: '<p>Pittige sambal</p>',
			description: '<p>Longer copy</p>',
			images: [{ src: 'https://woo.test/sambal.jpg' }],
			categories: [{ slug: 'sambal' }],
			attributes: [{ taxonomy: 'pa_merk-hot-sauce', name: 'Merk', terms: [{ name: 'Feroz' }] }]
		},
		{
			name: 'De Sambal - 250ml',
			slug: 'de-sambal-250',
			parent: 12,
			permalink: 'https://woo.test/product/de-sambal-250/',
			images: []
		},
		{
			name: 'Chutney',
			slug: 'chutney',
			parent: 0,
			permalink: 'https://woo.test/product/chutney/',
			short_description: '<p>Jam</p>',
			images: [],
			categories: [{ slug: 'jam' }]
		}
	]);

	it('maps a product, decoding entities and reading the brand attribute', async () => {
		const scraper = createWooScraper({ key: WOO_KEY, name: 'Woo Shop', url });
		const [sauce] = await scrapeAll(scraper);

		expect(sauce).toEqual({
			name: 'De Sambal – Per de Man',
			slug: 'de-sambal-per-de-man',
			description: 'Pittige sambal',
			url: 'https://woo.test/product/de-sambal/',
			imageUrl: 'https://woo.test/sambal.jpg',
			maker: 'Feroz'
		});
	});

	it('skips variations, which repeat their parent under another size', async () => {
		const scraper = createWooScraper({ key: WOO_KEY, name: 'Woo Shop', url });
		const sauces = await scrapeAll(scraper);

		expect(sauces.map((s) => s.slug)).not.toContain('de-sambal-250ml');
	});

	it('keeps only the wanted categories when configured', async () => {
		const scraper = createWooScraper({
			key: WOO_KEY,
			name: 'Woo Shop',
			url,
			includeCategories: ['sambal']
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces.map((s) => s.name)).toEqual(['De Sambal – Per de Man']);
	});

	it('leaves the maker unknown when no brand is reported', async () => {
		const scraper = createWooScraper({ key: WOO_KEY, name: 'Woo Shop', url });
		const sauces = await scrapeAll(scraper);

		expect(sauces.find((s) => s.name === 'Chutney')?.maker).toBeNull();
	});

	it('uses houseBrand when the shop makes its own sauce', async () => {
		const scraper = createWooScraper({
			key: WOO_KEY,
			name: 'Woo Shop',
			url,
			houseBrand: 'Woo Shop'
		});
		const sauces = await scrapeAll(scraper);

		expect(sauces.find((s) => s.name === 'Chutney')?.maker).toBe('Woo Shop');
	});
});
