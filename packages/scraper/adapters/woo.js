import {
	decodeEntities,
	isExcludedCategory,
	shouldSkipProduct,
	slugifyName,
	stripHtml,
	stripMakerFromName
} from '../utils/index.js';
import { cleanTitle, createCatalogueScraper } from './catalogue.js';

/** wc/store/v1 rejects per_page above 100. */
const PAGE_SIZE = 100;

/**
 * Product types the Store API reports that are never a single bottle. This is
 * the shop stating it outright, so it needs no name heuristic behind it.
 */
const BUNDLED_TYPES = new Set(['bundle', 'grouped', 'subscription', 'gift-card']);

/** Shops name their brand taxonomy in their own language. */
const BRAND_TAXONOMY = /\b(merk|brand|marque|marke|marca)\b/i;

/**
 * @param {any} product
 * @param {string | undefined} brandTaxonomy
 * @param {string | undefined} fallback
 * @returns {string | null} null when neither the feed nor the config names a maker
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
	return term ? decodeEntities(String(term)).trim() : (fallback ?? null);
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
		excludeCategories = [],
		brandTaxonomy,
		lang,
		houseBrand,
		renameMakers = {},
		stripFromName,
		maxPages,
		requestDelayMs,
		language
	} = config;

	const wantedCategories = new Set(includeCategories.map((slug) => slug.toLowerCase()));

	return createCatalogueScraper({
		key,
		name,
		url,
		description,
		language,
		pageSize: PAGE_SIZE,
		maxPages,
		requestDelayMs,

		// Multilingual shops answer in their own language unless asked; heatsupply
		// and hotta both honour ?lang=, the rest ignore it.
		buildPageUrl: (storeUrl, page, pageSize) =>
			`${storeUrl}/wp-json/wc/store/v1/products?per_page=${pageSize}&page=${page}` +
			(lang ? `&lang=${lang}` : ''),

		readPage: (payload) => (Array.isArray(payload) ? payload : []),

		toSauce(product) {
			// Variations repeat their parent's name under a different size, which would
			// collapse into duplicate sauces.
			if (product.parent) return null;

			// A bundle the shop has declared as one — no title ever says so.
			if (BUNDLED_TYPES.has(String(product.type))) return null;
			if (Array.isArray(product.grouped_products) && product.grouped_products.length > 0) {
				return null;
			}

			const rawTitle = decodeEntities(String(product.name ?? '')).trim();
			// short_description is the product blurb; description is the full page copy.
			const description = stripHtml(product.short_description || product.description);
			if (!product.permalink || shouldSkipProduct(rawTitle, exclude, description)) return null;

			const title = cleanTitle(rawTitle, stripFromName);
			if (!title) return null;

			if (wantedCategories.size > 0) {
				const categories = Array.isArray(product.categories) ? product.categories : [];
				const inWanted = categories.some((category) =>
					wantedCategories.has(String(category?.slug ?? '').toLowerCase())
				);
				if (!inWanted) return null;
			}

			const categoryLabels = (Array.isArray(product.categories) ? product.categories : []).flatMap(
				(category) => [String(category?.slug ?? ''), decodeEntities(String(category?.name ?? ''))]
			);
			if (isExcludedCategory(categoryLabels, rawTitle, excludeCategories)) return null;

			const rawMaker = extractMaker(product, brandTaxonomy, houseBrand);
			const maker = rawMaker ? (renameMakers[rawMaker] ?? rawMaker) : null;
			const sauceName = stripMakerFromName(title, maker);

			return {
				name: sauceName,
				slug: slugifyName(sauceName),
				description,
				url: product.permalink,
				imageUrl: product.images?.[0]?.src ?? null,
				maker
			};
		}
	});
}
