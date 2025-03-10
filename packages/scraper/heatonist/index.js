import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { getCachePath, slugifyName, writeFile } from '../utils/index.js';

const baseUrl = 'https://heatonist.com';
const cachePath = './cache/heatonist';

/**
 * @param {Document} document
 * @returns {string[]}
 */
function getProductUrls(document) {
	/** @type {string[]} */
	const urls = [];

	/** @type {NodeListOf<HTMLDivElement>} */
	const productsElements = document.querySelectorAll('.product');
	for (const product of productsElements) {
		const title = product.getAttribute('data-title');
		if (!title) continue;

		const lowerTitle = title.toLowerCase();

		if (lowerTitle.match(/\b(pack|trio|duo)\b/)) continue;
		if (lowerTitle.endsWith('socks')) continue;
		if (lowerTitle.match(/\b(monthly|subscription)\b/)) continue;
		if (lowerTitle.endsWith(' challenge')) continue;
		if (lowerTitle.includes('collection')) continue;
		if (lowerTitle.includes('sauce box')) continue;

		/** @type {HTMLAnchorElement | null} */
		const anchor = product.querySelector('a:first-child');
		if (!anchor) continue;

		urls.push(baseUrl + anchor.href);
	}

	return urls;
}

/** @type {import('../').GetSauceUrls} */
async function getSauceUrls(url, options) {
	const { cache } = options;

	if (!cache) {
		fs.rmSync(cachePath, { recursive: true, force: true });
	}

	const mainPageUrl = `${baseUrl}/collections/all-hot-sauces`;
	const mainPageCachePath = getCachePath('heatonist', mainPageUrl);
	if (!cache || !fs.existsSync(mainPageCachePath)) {
		const page = await fetch(mainPageUrl);
		const body = await page.text();
		writeFile(mainPageCachePath, body);
	}

	const mainPage = fs.readFileSync(mainPageCachePath, 'utf8');
	const mainDocument = new JSDOM(mainPage).window.document;

	// get total pages
	const paginationMessage = mainDocument.querySelector('.pagination-message');
	const numbers = paginationMessage?.textContent?.match(/\d+/g);
	const pageCount = parseInt(numbers?.[0] ?? '0');
	const totalProducts = parseInt(numbers?.[1] ?? '0');
	const totalPages = Math.ceil(totalProducts / pageCount);

	/** @type {string[]} */
	const sauceUrls = getProductUrls(mainDocument);

	for (let i = 2; i <= totalPages; i++) {
		const pageUrl = `${baseUrl}/collections/all-hot-sauces?page=${i}`;
		const pageCachePath = getCachePath('heatonist', pageUrl);

		if (!cache || !fs.existsSync(pageCachePath)) {
			const page = await fetch(pageUrl);
			const body = await page.text();
			writeFile(pageCachePath, body);
		}

		const page = fs.readFileSync(pageCachePath, 'utf8');
		const document = new JSDOM(page).window.document;

		sauceUrls.push(...getProductUrls(document));
	}

	return sauceUrls;
}

/** @type {import('../').ScrapeSauce} */
async function scrapeSauce(url, options) {
	const { cache } = options;
	const cachePath = getCachePath('heatonist', url);

	if (!cache || !fs.existsSync(cachePath)) {
		const page = await fetch(url);
		const body = await page.text();
		writeFile(cachePath, body);
	}

	const page = fs.readFileSync(cachePath, 'utf8');
	const document = new JSDOM(page).window.document;

	const name = document.querySelector('h1')?.textContent?.trim() ?? '';

	/** @type {HTMLImageElement | null} */
	const imageElement = document.querySelector('.product-image img');
	const descriptionElement = document.querySelector('#info-wrap .reveal-content p');

	let imageUrl = imageElement?.src.split('?')[0];
	if (imageUrl?.startsWith('//')) {
		imageUrl = 'https:' + imageUrl;
	}

	return {
		name,
		slug: slugifyName(name),
		url,
		description: descriptionElement?.textContent?.trim() ?? '',
		imageUrl
	};
}

/** @type {import('../').SauceScraper} */
export const scraper = {
	name: 'Heatonist',
	url: baseUrl,
	description:
		'Shop top rated hot sauce, from the official Hot Ones hot sauces to our own flavorful creations and collabs with the best hot sauce makers!',
	getSauceUrls,
	scrapeSauce
};
