import { createShopifyScraper } from './adapters/shopify.js';
import { createWooScraper } from './adapters/woo.js';
import { shopifyStores, wooStores } from './stores.js';

/**
 * @param {import('./').BaseScraperConfig[]} configs
 * @param {(config: any) => import('./').SauceScraper} create
 */
function register(configs, create) {
	return Object.fromEntries(configs.map((config) => [config.key, create(config)]));
}

/** @type {Record<string, import('./').SauceScraper>} */
export default {
	...register(shopifyStores, createShopifyScraper),
	...register(wooStores, createWooScraper)
};
