import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { getCachePath, writeFile } from '../utils/index.js';
import { createSitemapScraper, findJsonLdProduct } from './sitemap.js';
import { createWooScraper } from './woo.js';

const options = { cache: true, dbInsert: false, dev: false };

const KEY = '__test_sitemap';
const INDEX_KEY = '__test_sitemap_index';
const WOO_KEY = '__test_woo_refresh';
const url = 'https://sitemap.test';

/** @param {Record<string, unknown>} product */
function productPage(product) {
	const ld = JSON.stringify({ '@context': 'https://schema.org', ...product });
	return `<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`;
}

/** @param {string[]} locs */
function urlset(locs) {
	return `<?xml version="1.0"?><urlset>${locs.map((loc) => `<url><loc>${loc}</loc></url>`).join('')}</urlset>`;
}

/** @param {import('../').SauceScraper} scraper */
async function scrapeAll(scraper) {
	const urls = await scraper.getSauceUrls(scraper.url, options);
	const sauces = [];
	for (const productUrl of urls) {
		const sauce = await scraper.scrapeSauce(productUrl, options);
		if (sauce) sauces.push(sauce);
	}
	return sauces;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

afterAll(() => {
	for (const key of [KEY, INDEX_KEY, WOO_KEY]) {
		fs.rmSync(`./cache/${key}`, { recursive: true, force: true });
	}
});

describe('findJsonLdProduct', () => {
	it('finds a Product nested in @graph next to other blocks', () => {
		const html = [
			'<script type="application/ld+json">{"@type":"Organization","name":"Shop"}</script>',
			'<script type="application/ld+json">not json</script>',
			'<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Product","Thing"],"name":"Found"}]}</script>'
		].join('');
		expect(findJsonLdProduct(html)?.name).toBe('Found');
	});

	it('returns null for a page without one', () => {
		expect(
			findJsonLdProduct('<script type="application/ld+json">{"@type":"WebPage"}</script>')
		).toBeNull();
	});
});

describe('createSitemapScraper', () => {
	const wing = `${url}/en/shop/wing`;
	const rub = `${url}/en/shop/ghost-rub`;
	const own = `${url}/en/shop/house-edition`;
	const empty = `${url}/en/shop/no-ld`;

	writeFile(
		getCachePath(KEY, `${url}/sitemap.xml`, 'xml'),
		urlset([`${url}/en`, `${url}/en/shop`, wing, rub, own, empty, `${url}/en/shop/wing/reviews`])
	);
	writeFile(
		getCachePath(KEY, wing, 'html'),
		productPage({
			'@type': 'Product',
			name: 'Happy Hatter Hot Sauce - WING (Heat Level 6)',
			description: 'Red lentils as the base.<br><br>Habanero &amp; cayenne.',
			image: ['https://cdn.test/wing.webp'],
			brand: { '@type': 'Brand', name: 'Happy Hatter Hot Sauce' }
		})
	);
	writeFile(
		getCachePath(KEY, rub, 'html'),
		productPage({ '@type': 'Product', name: 'Black Coffee Ghost Rub', brand: 'Spice Co' })
	);
	writeFile(
		getCachePath(KEY, own, 'html'),
		productPage({
			'@type': 'Product',
			name: 'The 2025 Edition Hot Sauce',
			image: { url: 'https://cdn.test/own.webp' }
		})
	);
	writeFile(getCachePath(KEY, empty, 'html'), '<html></html>');

	const create = (/** @type {Partial<import('../').SitemapScraperConfig>} */ extra = {}) =>
		createSitemapScraper({
			key: KEY,
			name: 'Sitemap Shop',
			url,
			productPath: /^\/en\/shop\/[^/]+$/,
			...extra
		});

	it('keeps only sitemap entries that match productPath', async () => {
		const urls = await create().getSauceUrls(url, options);
		expect(urls.sort()).toEqual([empty, rub, own, wing].sort());
	});

	it('maps a product page onto a sauce', async () => {
		const sauce = await create().scrapeSauce(wing, options);
		expect(sauce).toEqual({
			name: 'WING',
			slug: 'wing',
			description: 'Red lentils as the base.\n\nHabanero & cayenne.',
			url: wing,
			imageUrl: 'https://cdn.test/wing.webp',
			maker: 'Happy Hatter Hot Sauce'
		});
	});

	it('drops products the shared filter rejects and pages without a Product', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const names = (await scrapeAll(create())).map((sauce) => sauce.name);
		expect(names).not.toContain('Black Coffee Ghost Rub');
		expect(names).toHaveLength(2);
	});

	it('uses houseBrand when the page names no brand', async () => {
		const sauce = await create({ houseBrand: 'Sitemap Shop' }).scrapeSauce(own, options);
		expect(sauce?.maker).toBe('Sitemap Shop');
		expect(sauce?.imageUrl).toBe('https://cdn.test/own.webp');
	});

	it('follows a sitemap index one level down', async () => {
		writeFile(
			getCachePath(INDEX_KEY, `${url}/sitemap.xml`, 'xml'),
			`<sitemapindex><sitemap><loc>${url}/product-sitemap.xml</loc></sitemap></sitemapindex>`
		);
		writeFile(
			getCachePath(INDEX_KEY, `${url}/product-sitemap.xml`, 'xml'),
			urlset([wing, `${url}/about`])
		);
		const scraper = createSitemapScraper({
			key: INDEX_KEY,
			name: 'Index Shop',
			url,
			productPath: /^\/en\/shop\//
		});
		expect(await scraper.getSauceUrls(url, options)).toEqual([wing]);
	});

	it('keeps the cache when a refresh is refused', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('Forbidden', { status: 403 }))
		);
		await expect(create().getSauceUrls(url, { ...options, cache: false })).rejects.toThrow('403');
		expect(fs.existsSync(getCachePath(KEY, wing, 'html'))).toBe(true);
	});
});

describe('catalogue refresh', () => {
	it('keeps the cache when the first page is refused', async () => {
		const pageUrl = `${url}/wp-json/wc/store/v1/products?per_page=100&page=1`;
		writeFile(getCachePath(WOO_KEY, pageUrl, 'json'), '[]');
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('Forbidden', { status: 403 }))
		);

		const scraper = createWooScraper({ key: WOO_KEY, name: 'Woo Shop', url });
		await expect(scraper.getSauceUrls(url, { ...options, cache: false })).rejects.toThrow('403');
		expect(fs.existsSync(getCachePath(WOO_KEY, pageUrl, 'json'))).toBe(true);
	});
});
