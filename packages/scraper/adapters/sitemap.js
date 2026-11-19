import fs from 'node:fs';
import {
	decodeEntities,
	fetchPage,
	getCachePath,
	shouldSkipProduct,
	sleep,
	slugifyName,
	stripHtml,
	stripMakerFromName,
	writeFile
} from '../utils/index.js';
import { cleanTitle, imageList, IMAGES_PER_STORE, trimTrailingSlash } from './catalogue.js';

/** One request per product page, so pace it like a person browsing. */
const DEFAULT_REQUEST_DELAY_MS = 1000;

/** Bounds a sitemap index that links back into itself. */
const MAX_SITEMAPS = 20;

/**
 * @param {string} xml
 * @param {'sitemap' | 'url'} parent
 */
function readLocs(xml, parent) {
	const blocks = xml.match(new RegExp(`<${parent}\\b[\\s\\S]*?</${parent}>`, 'g')) ?? [];
	return blocks
		.map((block) => block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1])
		.filter((loc) => typeof loc === 'string')
		.map((loc) => decodeEntities(loc));
}

/** @param {unknown} type */
function isProductType(type) {
	return Array.isArray(type) ? type.includes('Product') : type === 'Product';
}

/**
 * The first schema.org Product in a page's JSON-LD, looking inside arrays and
 * `@graph`, which is how Yoast and most SEO plugins nest it.
 *
 * @param {string} html
 * @returns {Record<string, any> | null}
 */
export function findJsonLdProduct(html) {
	const scripts = html.matchAll(
		/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
	);

	for (const [, json] of scripts) {
		/** @type {unknown} */
		let data;
		try {
			data = JSON.parse(json);
		} catch {
			continue;
		}

		/** @type {unknown[]} */
		const queue = [data];
		while (queue.length > 0) {
			const node = queue.shift();
			if (Array.isArray(node)) {
				queue.push(...node);
			} else if (node && typeof node === 'object') {
				const record = /** @type {Record<string, any>} */ (node);
				if (isProductType(record['@type'])) return record;
				if (record['@graph']) queue.push(record['@graph']);
			}
		}
	}

	return null;
}

/**
 * `brand` and `image` may each be a string, an object or an array of either.
 *
 * @param {unknown} value
 * @param {string} field the property holding the string when it is an object
 * @returns {string | null}
 */
function firstString(value, field) {
	const first = Array.isArray(value) ? value[0] : value;
	if (typeof first === 'string') return first.trim() || null;
	if (first && typeof first === 'object') {
		const inner = /** @type {Record<string, unknown>} */ (first)[field];
		return typeof inner === 'string' ? inner.trim() || null : null;
	}
	return null;
}

/**
 * Builds a scraper for a store with no product API, from the product pages its
 * sitemap lists and the schema.org Product each page embeds for search engines.
 *
 * @param {import('../').SitemapScraperConfig} config
 * @returns {import('../').SauceScraper}
 */
export function createSitemapScraper(config) {
	const {
		key,
		name,
		url,
		description,
		language = 'en',
		sitemapUrl = `${trimTrailingSlash(url)}/sitemap.xml`,
		productPath,
		exclude = [],
		houseBrand,
		renameMakers = {},
		stripFromName,
		requestDelayMs = DEFAULT_REQUEST_DELAY_MS
	} = config;

	/**
	 * @param {string} pageUrl
	 * @param {string} ext
	 * @param {{ cache: boolean, clearCache?: boolean }} options
	 */
	async function fetchCached(pageUrl, ext, { cache, clearCache = false }) {
		const cachePath = getCachePath(key, pageUrl, ext);

		if (!cache || !fs.existsSync(cachePath)) {
			const response = await fetchPage(pageUrl);
			if (!response.ok) {
				throw new Error(`${pageUrl} responded ${response.status}`);
			}
			const body = await response.text();
			// Only once the store has answered, so a failed refresh keeps the old cache.
			if (clearCache) fs.rmSync(`./cache/${key}`, { recursive: true, force: true });
			writeFile(cachePath, body);
			await sleep(requestDelayMs);
		}

		return fs.readFileSync(cachePath, 'utf8');
	}

	/** @type {import('../').GetSauceUrls} */
	async function getSauceUrls(_storeUrl, options) {
		const root = await fetchCached(sitemapUrl, 'xml', {
			cache: options.cache,
			clearCache: !options.cache
		});

		// A sitemap index splits the site across child sitemaps; follow one level.
		const children = readLocs(root, 'sitemap').slice(0, MAX_SITEMAPS);
		const sitemaps = children.length > 0 ? children : [sitemapUrl];

		const urls = new Set();
		for (const sitemap of sitemaps) {
			const xml = sitemap === sitemapUrl ? root : await fetchCached(sitemap, 'xml', options);
			for (const loc of readLocs(xml, 'url')) {
				if (productPath.test(new URL(loc).pathname)) urls.add(loc);
			}
		}

		return [...urls];
	}

	/** @type {import('../').ScrapeSauce} */
	async function scrapeSauce(productUrl, options) {
		const product = findJsonLdProduct(await fetchCached(productUrl, 'html', options));
		if (!product) {
			console.warn(`No schema.org Product on ${productUrl}`);
			return null;
		}

		const rawTitle = decodeEntities(String(product.name ?? '')).trim();
		const sauceDescription = stripHtml(decodeEntities(String(product.description ?? '')));
		if (!rawTitle || shouldSkipProduct(rawTitle, exclude, sauceDescription)) return null;

		const title = cleanTitle(rawTitle, stripFromName);
		if (!title) return null;

		const brand = firstString(product.brand, 'name');
		const rawMaker = brand ? decodeEntities(brand) : (houseBrand ?? null);
		const maker = rawMaker ? (renameMakers[rawMaker] ?? rawMaker) : null;
		const sauceName = stripMakerFromName(title, maker);

		return {
			name: sauceName,
			slug: slugifyName(sauceName),
			description: sauceDescription,
			url: productUrl,
			imageUrls: imageList(
				(Array.isArray(product.image) ? product.image : [product.image]).map((image) =>
					image && typeof image === 'object' ? image.url : image
				),
				IMAGES_PER_STORE
			),
			maker
		};
	}

	return { name, url, description, language, getSauceUrls, scrapeSauce };
}
