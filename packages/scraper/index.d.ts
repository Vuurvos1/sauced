import type { HotSauceInsert, StoreInsert } from '@app/db/types';

export type ScrapeSauceOptions = {
	cache: boolean;
	dbInsert: boolean;
	dev: boolean;
};

/**
 * `url` and `maker` are not `hot_sauces` columns — drizzle builds its SET/VALUES
 * from the table's columns, so the extras ride along harmlessly. `url` becomes the
 * store_hot_sauces link; `maker` is the brand the store reports, ready for the
 * makers table once that ingest lands.
 */
export type Sauce = HotSauceInsert & { url: string; maker?: string };

export type GetSauceUrls = (url: string, options: ScrapeSauceOptions) => Promise<string[]>;
export type ScrapeSauce = (url: string, options: ScrapeSauceOptions) => Promise<Sauce | null>;

// Could be a class with method chaining?
export type SauceScraper = StoreInsert & {
	/** Language the shop publishes in. Non-English shops only fill empty descriptions. */
	language?: string;
	getSauceUrls: GetSauceUrls;
	scrapeSauce: ScrapeSauce;
};

export type Maker = {
	name: string;
	description?: string;
	url?: string;
	logoUrl?: string;
};

/** Shared by every store served from a paginated JSON catalogue. */
export type BaseScraperConfig = StoreInsert & {
	/** Registry key in `scrapers.js`, and the cache directory name. */
	key: string;
	/** Product names matching any of these are skipped, on top of the bundle filter. */
	exclude?: RegExp[];
	/** Used when the feed reports no brand. Defaults to the store name. */
	houseBrand?: string;
	/** Removed from the product title, for stores that append the brand to it. */
	/** Renames a brand the feed spells oddly, e.g. `Pepper Palace Warehouse` -> `Pepper Palace`. */
	renameMakers?: Record<string, string>;
	stripFromName?: RegExp;
	/** Safety valve against a feed that never signals its end. Default 40. */
	maxPages?: number;
	/** Pause after each live request. Default 500ms. */
	requestDelayMs?: number;
};

export type ShopifyScraperConfig = BaseScraperConfig & {
	/** Language the shop publishes in, e.g. `fr`. Defaults to `en`. */
	language?: string;
	/** Collection handle, to narrow a general store to its sauce aisle. */
	collection?: string;
	/** Vendors to drop, for shops that also sell snacks or kitchenware. */
	excludeVendors?: string[];
};

export type WooScraperConfig = BaseScraperConfig & {
	/** Language the shop publishes in, e.g. `fr`. Defaults to `en`. */
	language?: string;
	/** Category slugs to keep. Empty means keep everything. */
	includeCategories?: string[];
	/** Attribute taxonomy holding the brand, e.g. `pa_merk-hot-sauce`. Auto-detected when unset. */
	brandTaxonomy?: string;
	/** Language for a multilingual shop, e.g. `en`. Ignored by shops without translations. */
	lang?: string;
};

export type CatalogueScraperConfig = BaseScraperConfig & {
	pageSize: number;
	buildPageUrl: (storeUrl: string, page: number, pageSize: number) => string;
	readPage: (payload: any) => any[];
	toSauce: (product: any, storeUrl: string) => Sauce | null;
};
