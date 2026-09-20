import { decodeEntities, shouldSkipProduct, slugifyName, stripHtml } from '../utils/index.js';
import { cleanTitle, createCatalogueScraper } from './catalogue.js';

/** wc/store/v1 rejects per_page above 100. */
const PAGE_SIZE = 100;

/** Shops name their brand taxonomy in their own language. */
const BRAND_TAXONOMY = /\b(merk|brand|marque|marke|marca)\b/i;

/**
 * @param {any} product
 * @param {string | undefined} brandTaxonomy
 * @param {string} fallback
 */
function extractMaker(product, brandTaxonomy, fallback) {
	// WooCommerce 9.6+ ships a first-class brands taxonomy; older shops model it
	// as a product attribute instead.
	const brand = product.brands?.[0]?.name;
	if (brand) return decodeEntities(String(brand)).trim();

	const attributes = Array.isArray(product.attributes) ? product.attributes : [];
	const attribute = attributes.find((attr) =>
		brandTaxonomy
			? attr?.taxonomy === brandTaxonomy
			: BRAND_TAXONOMY.test(String(attr?.taxonomy ?? '')) ||
				BRAND_TAXONOMY.test(String(attr?.name ?? ''))
	);

	const term = attribute?.terms?.[0]?.name;
	return term ? decodeEntities(String(term)).trim() : fallback;
}

/**
 * Builds a scraper for any WooCommerce store from its public Store API.
 *
 * @param {import('../').WooScraperConfig} config
 * @returns {import('../').SauceScraper}
 */
export function createWooScraper(config) {
	const {
		key,
		name,
		url,
		description,
		exclude = [],
		includeCategories = [],
		brandTaxonomy,
		houseBrand = name,
		stripFromName,
		maxPages,
		requestDelayMs
	} = config;

	const wantedCategories = new Set(includeCategories.map((slug) => slug.toLowerCase()));

	return createCatalogueScraper({
		key,
		name,
		url,
		description,
		pageSize: PAGE_SIZE,
		maxPages,
		requestDelayMs,

		buildPageUrl: (storeUrl, page, pageSize) =>
			`${storeUrl}/wp-json/wc/store/v1/products?per_page=${pageSize}&page=${page}`,

		readPage: (payload) => (Array.isArray(payload) ? payload : []),

		toSauce(product) {
			// Variations repeat their parent's name under a different size, which would
			// collapse into duplicate sauces.
			if (product.parent) return null;

			const rawTitle = decodeEntities(String(product.name ?? '')).trim();
			if (!product.permalink || shouldSkipProduct(rawTitle, exclude)) return null;

			const title = cleanTitle(rawTitle, stripFromName);
			if (!title) return null;

			if (wantedCategories.size > 0) {
				const categories = Array.isArray(product.categories) ? product.categories : [];
				const inWanted = categories.some((category) =>
					wantedCategories.has(String(category?.slug ?? '').toLowerCase())
				);
				if (!inWanted) return null;
			}

			return {
				name: title,
				slug: slugifyName(title),
				// short_description is the product blurb; description is the full page copy.
				description: stripHtml(product.short_description || product.description),
				url: product.permalink,
				imageUrl: product.images?.[0]?.src ?? null,
				maker: extractMaker(product, brandTaxonomy, houseBrand)
			};
		}
	});
}
