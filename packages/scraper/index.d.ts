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

/** One scraped listing, tagged with the shop it came from. */
export type ScrapedRow = {
	/** Config key of the shop, used to scope a listing whose brand is unknown. */
	storeKey: string;
	/** Whether the shop publishes English, which decides description precedence. */
	english: boolean;
	sauce: Sauce;
};

/** Everything one shop returned in a run. */
export type StoreRun = {
	storeKey: string;
	scraper: SauceScraper;
	rows: ScrapedRow[];
};

/** One sauce a maker sells under several names. The first is the one kept. */
export type SauceAlias = {
	maker: string;
	names: string[];
};

/** The listings that resolved to a single sauce. */
export type SauceGroup = {
	makerKey: string;
	rows: ScrapedRow[];
};

/** A `hot_sauces` row already in the database, with its brand resolved. */
export type StoredSauce = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	imageUrl: string | null;
	makerId: string | null;
	makerName: string | null;
};

export type GetSauceUrls = (url: string, options: ScrapeSauceOptions) => Promise<string[]>;
export type ScrapeSauce = (url: string, options: ScrapeSauceOptions) => Promise<Sauce | null>;

// Could be a class with method chaining?
export type SauceScraper = StoreInsert & {
	/** Language the shop publishes in. Non-English shops only fill empty descriptions. */
	language?: string;
	getSauceUrls: GetSauceUrls;
	scrapeSauce: ScrapeSauce;
};

/** Shared by every store served from a paginated JSON catalogue. */
export type BaseScraperConfig = StoreInsert & {
	/** Registry key in `scrapers.js`, and the cache directory name. */
	key: string;
	/** Kept out of `scrape all`; still runnable by key. */
	disabled?: boolean;
	/** Product names matching any of these are skipped, on top of the bundle filter. */
	exclude?: RegExp[];
	/**
	 * Categories this shop files non-sauce under, on top of the shared blocklist —
	 * for aisles only this shop has, or ones its own wording hides. Matched against
	 * a Woo category slug and name, or a Shopify `product_type`, case-insensitively
	 * as a substring. Unlike the shared list, these are never overruled by a title
	 * that says "sauce".
	 */
	excludeCategories?: string[];
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
