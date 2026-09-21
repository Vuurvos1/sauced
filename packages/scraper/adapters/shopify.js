import {
	decodeEntities,
	shouldSkipProduct,
	slugifyName,
	stripHtml,
	stripMakerFromName
} from '../utils/index.js';
import { cleanTitle, createCatalogueScraper, trimTrailingSlash } from './catalogue.js';

/** Shopify caps products.json at 250 per page. */
const PAGE_SIZE = 250;

/**
 * Vendor defaults a new Shopify store leaves behind. They name the shop, not the
 * maker, so they're treated as "no vendor" and fall back to the house brand.
 */
const PLACEHOLDER_VENDORS = new Set([
	'mijn winkel',
	'my store',
	'default title',
	'default vendor',
	// Shops that file merchandising states in the vendor field.
	'gift set',
	'discontinued',
	'sale',
	'new',
	'misc',
	'other',
	'unknown'
]);

/**
 * @param {unknown} vendor
 * @param {string | undefined} fallback
 * @returns {string | null} null when neither the feed nor the config names a maker
 */
function cleanVendor(vendor, fallback) {
	const name = decodeEntities(String(vendor ?? '')).trim();
	if (!name || PLACEHOLDER_VENDORS.has(name.toLowerCase())) return fallback ?? null;
	return name;
}

/**
 * Builds a scraper for any Shopify store from its public `/products.json` feed.
 *
 * @param {import('../').ShopifyScraperConfig} config
 * @returns {import('../').SauceScraper}
 */
export function createShopifyScraper(config) {
	const {
		key,
		name,
		url,
		description,
		collection,
		exclude = [],
		excludeVendors = [],
		houseBrand,
		stripFromName,
		maxPages,
		requestDelayMs,
		language
	} = config;

	const skippedVendors = new Set(excludeVendors.map((vendor) => vendor.toLowerCase()));

	return createCatalogueScraper({
		key,
		name,
		url,
		description,
		language,
		pageSize: PAGE_SIZE,
		maxPages,
		requestDelayMs,

		buildPageUrl(storeUrl, page, pageSize) {
			// A collection handle narrows a general store down to its sauce aisle.
			const path = collection ? `/collections/${collection}/products.json` : '/products.json';
			return `${storeUrl}${path}?limit=${pageSize}&page=${page}`;
		},

		readPage: (payload) => payload?.products ?? [],

		toSauce(product, storeUrl) {
			// Bundle filtering reads the original title — the suffix can carry the
			// word that marks it as merch.
			const rawTitle = decodeEntities(String(product.title ?? '')).trim();
			if (!product.handle || shouldSkipProduct(rawTitle, exclude)) return null;

			const title = cleanTitle(rawTitle, stripFromName);
			if (!title) return null;

			const vendor = cleanVendor(product.vendor, houseBrand);
			if (vendor && skippedVendors.has(vendor.toLowerCase())) return null;

			const sauceName = stripMakerFromName(title, vendor);

			return {
				name: sauceName,
				slug: slugifyName(sauceName),
				description: stripHtml(product.body_html),
				url: `${trimTrailingSlash(storeUrl)}/products/${product.handle}`,
				imageUrl: product.images?.[0]?.src ?? null,
				maker: vendor
			};
		}
	});
}
