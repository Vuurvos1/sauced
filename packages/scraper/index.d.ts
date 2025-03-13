import type { HotSauceInsert, StoreInsert } from '@app/db/types';

export type ScrapeSauceOptions = {
	cache: boolean;
	dbInsert: boolean;
	dev: boolean;
};

export type Sauce = HotSauceInsert & { url: string };

export type GetSauceUrls = (url: string, options: ScrapeSauceOptions) => Promise<string[]>;
export type ScrapeSauce = (url: string, options: ScrapeSauceOptions) => Promise<Sauce | null>;

// Could be a class with method chaining?
export type SauceScraper = StoreInsert & {
	getSauceUrls: GetSauceUrls;
	scrapeSauce: ScrapeSauce;
};

export type Maker = {
	name: string;
	description?: string;
	url?: string;
	logoUrl?: string;
};
