import fs from 'node:fs';
import {
	cleanProductName,
	decodeEntities,
	fetchPage,
	getCachePath,
	sleep,
	writeFile
} from '../utils/index.js';

/** High enough for the largest catalogue found (~900 products), low enough to bound a bad config. */
const DEFAULT_MAX_PAGES = 40;

/** Storefront APIs are meant for their own shop front, so don't hammer them. */
const DEFAULT_REQUEST_DELAY_MS = 500;

/**
 * @param {string} url
 */
export function trimTrailingSlash(url) {
	return url.replace(/\/+$/, '');
}

/**
 * Some stores bake the brand into the product title ("Garlic Habanero | The
 * Pepper Ninja"). Left in, the same sauce from two stores never dedupes.
 *
 * @param {unknown} raw
 * @param {RegExp} [stripFromName]
 */
export function cleanTitle(raw, stripFromName) {
	const title = decodeEntities(String(raw ?? '')).trim();
	const stripped = stripFromName ? title.replace(stripFromName, '').trim() : title;
	return cleanProductName(stripped);
}

/**
 * Shared engine for stores that expose a paginated JSON product API.
 *
 * Unlike the HTML scrapers, one request returns up to 250 products, so the whole
 * catalogue is read during `getSauceUrls` and `scrapeSauce` is a lookup. That
 * keeps the `SauceScraper` interface — and so `index.js` — unchanged, while
 * turning a per-product fetch into one request per page.
 *
 * @param {import('../').CatalogueScraperConfig} config
 * @returns {import('../').SauceScraper}
 */
export function createCatalogueScraper(config) {
	const {
		key,
		name,
		url,
		description,
		language = 'en',
		pageSize,
		maxPages = DEFAULT_MAX_PAGES,
		requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
		buildPageUrl,
		readPage,
		toSauce
	} = config;

	/** @type {Map<string, import('../').Sauce>} Filled by getSauceUrls, read by scrapeSauce. */
	const saucesByUrl = new Map();

	/**
	 * @param {string} pageUrl
	 * @param {import('../').ScrapeSauceOptions} options
	 */
	async function fetchJsonPage(pageUrl, options) {
		const cachePath = getCachePath(key, pageUrl, 'json');

		if (!options.cache || !fs.existsSync(cachePath)) {
			const response = await fetchPage(pageUrl, { headers: { Accept: 'application/json' } });
			if (!response.ok) {
				throw new Error(`${pageUrl} responded ${response.status}`);
			}
			writeFile(cachePath, await response.text());

			// Only pause after a real request — replaying the cache shouldn't crawl.
			await sleep(requestDelayMs);
		}

		return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
	}

	/** @type {import('../').GetSauceUrls} */
	async function getSauceUrls(storeUrl, options) {
		saucesByUrl.clear();

		if (!options.cache) {
			fs.rmSync(`./cache/${key}`, { recursive: true, force: true });
		}

		let exhausted = false;

		for (let page = 1; page <= maxPages; page++) {
			const pageUrl = buildPageUrl(trimTrailingSlash(storeUrl), page, pageSize);

			/** @type {unknown[]} */
			let products;
			try {
				products = readPage(await fetchJsonPage(pageUrl, options));
			} catch (error) {
				// A first-page failure means a broken config or a store that's down, and
				// should be loud. Later pages failing just truncates the catalogue, and a
				// partial scrape is still worth keeping.
				if (page === 1) throw error;
				console.warn(`Stopping ${key} at page ${page}:`, /** @type {Error} */ (error).message);
				exhausted = true;
				break;
			}

			if (products.length === 0) {
				exhausted = true;
				break;
			}

			for (const product of products) {
				const sauce = toSauce(product, trimTrailingSlash(storeUrl));
				if (sauce) saucesByUrl.set(sauce.url, sauce);
			}

			if (products.length < pageSize) {
				exhausted = true;
				break;
			}
		}

		if (!exhausted) {
			console.warn(`${key} hit the ${maxPages} page cap — the catalogue may be truncated`);
		}

		return Array.from(saucesByUrl.keys());
	}

	/** @type {import('../').ScrapeSauce} */
	async function scrapeSauce(productUrl) {
		const sauce = saucesByUrl.get(productUrl);
		if (!sauce) {
			console.warn(`No product cached for ${productUrl} — was getSauceUrls run first?`);
			return null;
		}
		return sauce;
	}

	return { name, url, description, language, getSauceUrls, scrapeSauce };
}
