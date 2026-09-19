import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { fetchPage, getCachePath, slugifyName, writeFile } from '../utils/index.js';

const baseUrl = 'https://t-rexhotsauce.com';
const cachePath = './cache/trex';

/** @type {import('../').GetSauceUrls} */
async function getSauceUrls(url, options) {
	const { cache } = options;

	if (!cache) {
		fs.rmSync(cachePath, { recursive: true, force: true });
	}

	const pageUrl = `${url}/collections/all`;
	const pageCachePath = getCachePath('trex', pageUrl);

	if (!cache || !fs.existsSync(pageCachePath)) {
		const page = await fetchPage(pageUrl);
		const body = await page.text();
		writeFile(pageCachePath, body);
	}

	const page = fs.readFileSync(pageCachePath, 'utf8');
	const document = new JSDOM(page).window.document;

	/** @type {NodeListOf<HTMLAnchorElement>} */
	const productElements = document.querySelectorAll('a.product-card__heading');

	const hrefs = new Set(Array.from(productElements, (el) => `${url}${el.getAttribute('href')}`));
	return Array.from(hrefs);
}

/** @type {import('../').ScrapeSauce} */
async function scrapeSauce(url, options) {
	const { cache } = options;
	const cachePath = getCachePath('trex', url);

	if (!cache || !fs.existsSync(cachePath)) {
		const page = await fetchPage(url);
		const body = await page.text();
		writeFile(cachePath, body);
	}

	const page = fs.readFileSync(cachePath, 'utf8');
	const document = new JSDOM(page).window.document;

	const name = document.querySelector('h1')?.textContent?.trim() ?? '';
	const description =
		document.querySelector('.product__description')?.textContent?.trim().replace(/^"|"$/g, '') ||
		'';
	if (!description) {
		console.warn('No description found for', name);
	}

	/** @type {HTMLImageElement | null} */
	const img = document.querySelector('.product__media img'); // TODO: maybe get all images

	return {
		name,
		slug: slugifyName(name),
		description,
		url,
		imageUrl: img?.src ? `https:${img.src}` : null
	};
}

/** @type {import('../').SauceScraper} */
export const scraper = {
	name: 'T-Rex Hot Sauce',
	url: baseUrl,
	description:
		'T-rex Hot sauce is a Amsterdam based hot sauce brand. From our own little kitchen we make small batches of vegan and fermented hot sauce.',
	getSauceUrls,
	scrapeSauce
};
