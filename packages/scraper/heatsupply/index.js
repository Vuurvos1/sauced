import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { getCachePath, slugifyName, writeFile } from '../utils/index.js';

const baseUrl = 'https://heatsupply.nl';
const cachePath = './cache/heatsupply';

/** @type {import('../').GetSauceUrls} */
async function getSauceUrls(url, options) {
	const { cache } = options;

	if (!cache) {
		fs.rmSync(cachePath, { recursive: true, force: true });
	}

	/** @type {string[]} */
	const sauceUrls = [];

	// hard limit pages just in case
	for (let i = 1; i < 100; i++) {
		const pageUrl = `${url}/en/product-categorie/hot-sauces-europe/?_paged=${i}`;
		const pageCachePath = getCachePath('heatsupply', pageUrl);

		if (!cache || !fs.existsSync(pageCachePath)) {
			const page = await fetch(pageUrl);
			const body = await page.text();
			writeFile(pageCachePath, body);
		}

		const page = fs.readFileSync(pageCachePath, 'utf8');
		const document = new JSDOM(page).window.document;

		const productElements = document.querySelectorAll('.products .product');
		if (productElements.length === 0) break;

		for (const el of productElements) {
			const name = el.querySelector('h3')?.textContent?.trim();
			if (!name) continue;

			const lowerName = name.toLowerCase();

			if (
				lowerName.match(/\b\d+(?:-|\s)?pack\b/) || // "pack" "3 pack" "3-pack" etc.
				lowerName.includes('giftset') ||
				lowerName.match(/\b(monthly|subscription|challenge|collection)\b/)
			) {
				console.info('Skipping bundle', name);
				continue;
			}

			const link = el.querySelector('a')?.href;
			if (link) sauceUrls.push(link);
		}
	}

	return sauceUrls;
}

/** @type {import('../').ScrapeSauce} */
async function scrapeSauce(url, options) {
	const { cache } = options;
	const cachePath = getCachePath('heatsupply', url);

	if (!cache || !fs.existsSync(cachePath)) {
		const page = await fetch(url);
		const body = await page.text();
		writeFile(cachePath, body);
	}

	const page = fs.readFileSync(cachePath, 'utf8');
	const document = new JSDOM(page).window.document;

	const name = document.querySelector('h1')?.textContent?.trim() ?? '';

	// const maker =
	//   document
	//     .querySelector(
	//       '.woocommerce-product-attributes-item--attribute_pa_merk-hot-sauce td p'
	//     )
	//     ?.textContent.trim() ?? '';

	/** @type {HTMLImageElement | null} */
	const imageEl = document.querySelector('.woocommerce-product-gallery__image img.wp-post-image');

	const descriptionElement = document.querySelector(
		'.woocommerce-product-details__short-description > p'
	);

	return {
		name,
		slug: slugifyName(name),
		url,
		description: descriptionElement?.textContent?.trim() ?? '',
		imageUrl: imageEl?.src ?? null
	};
}

/** @type {import('../').SauceScraper} */
export const scraper = {
	name: 'Heatsupply',
	url: baseUrl,
	description:
		'Do you love hot sauce? Then you are at the right place. Heatsupply has a wide and changing assortment of great hot sauces and other spicyness.',
	getSauceUrls,
	scrapeSauce
};
