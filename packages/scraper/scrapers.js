import { createShopifyScraper } from './adapters/shopify.js';
import { createWooScraper } from './adapters/woo.js';
import { makerAliases, shopifyStores, wooStores } from './stores.js';

/**
 * @param {import('./').BaseScraperConfig[]} configs
 * @param {(config: any) => import('./').SauceScraper} create
 */
function register(configs, create) {
	return Object.fromEntries(
		configs.map((config) => [
			config.key,
			// A store's own renames win over the shared ones.
			create({ ...config, renameMakers: { ...makerAliases, ...config.renameMakers } })
		])
	);
}

/**
 * A disabled store stays registered so `scrape <key>` can still reach it; only
 * `scrape all` skips it.
 */
export const enabledKeys = [...shopifyStores, ...wooStores]
	.filter((config) => !config.disabled)
	.map((config) => config.key);

/** @type {Record<string, import('./').SauceScraper>} */
export default {
	...register(shopifyStores, createShopifyScraper),
	...register(wooStores, createWooScraper)
};
