/**
 * Every store below serves its whole catalogue as JSON, so adding one is config
 * rather than code. Platform and product counts were measured against the live
 * endpoints; see the repo TODO for the stores that still need bespoke scrapers.
 *
 * `houseBrand` is only set for a shop that makes its own sauce. A retailer whose
 * feed names no brand leaves the maker unknown rather than claiming it made the
 * product — Hot Sauce Emporium's feed names no brands at all, and it stocks Pain
 * Is Good and Marie Sharp's.
 *
 * `key` is the CLI name (`pnpm scrapers scrape <key>`) and the cache directory.
 * `name` must stay stable — `stores.name` is unique and upserted on.
 */

/** @type {import('./').ShopifyScraperConfig[]} */
export const shopifyStores = [
	{
		key: 'trex',
		name: 'T-Rex Hot Sauce',
		url: 'https://t-rexhotsauce.com',
		description:
			'T-rex Hot sauce is a Amsterdam based hot sauce brand. From our own little kitchen we make small batches of vegan and fermented hot sauce.',
		houseBrand: 'T-rex Hot sauce'
	},
	{
		key: 'heatonist',
		name: 'Heatonist',
		url: 'https://heatonist.com',
		description:
			'Shop top rated hot sauce, from the official Hot Ones hot sauces to our own flavorful creations and collabs with the best hot sauce makers!',
		// Same scope the HTML scraper crawled. The feed also carries internal duplicate
		// listings suffixed "-C", which have no description and repeat a real product.
		collection: 'all-hot-sauces',
		exclude: [/\s-C$/]
		// Titles read "Garlic Habanero | The Pepper Ninja". Stripping the brand with
		// `stripFromName: /\s*\|[\s\S]*$/` reads better and helps cross-store dedup,
		// but collapses 8 sauces onto colliding slugs — different makers share a
		// product name. Enable it once `hot_sauces` is unique per (maker, name)
		// instead of globally, otherwise onConflictDoNothing drops them silently.
	},
	{
		key: 'scovello',
		language: 'nl',
		name: 'Scovello',
		url: 'https://scovello.nl'
	},
	{
		key: 'sausmetpit',
		name: 'Saus Met Pit',
		url: 'https://www.sausmetpit.nl',
		// Also stocks crisps and noodles under these brands.
		excludeVendors: ['Takis', 'Hot Chip EU', 'Santa Maria']
	},
	{
		key: 'raijmakers',
		name: 'Raijmakers Heetmakers',
		url: 'https://shop.raijmakersheetmakers.com',
		// The feed still carries Shopify's default vendor, so fall back to the brand.
		houseBrand: 'Raijmakers Heetmakers'
	},
	{
		key: 'redhotfoods',
		name: 'Red Hot Foods',
		url: 'https://www.redhotfoods.de',
		excludeVendors: ['Balvi', 'Ibili', 'Grillart', 'Probios']
	},
	{
		key: 'heathotsauce',
		name: 'Heat Hot Sauce Shop',
		url: 'https://heathotsauce.com'
	},
	{
		key: 'pepperpalace',
		name: 'Pepper Palace',
		url: 'https://pepperpalace.com',
		// Their own line ships under an internal warehouse name.
		renameMakers: { 'Pepper Palace Warehouse': 'Pepper Palace' }
	},
	{
		key: 'torchbearer',
		houseBrand: 'Torchbearer Sauces',
		name: 'Torchbearer Sauces',
		url: 'https://www.torchbearersauces.com'
	},
	{
		key: 'somelikeithot',
		name: 'Some Like It Hot',
		url: 'https://somelikeithot.shop',
		// A running joke listed as a real product: "We're sorry.... this doesn't
		// exist (yet)... but if it did we would stock it". The only one in the
		// catalogue, so a name match is cheaper than reading descriptions.
		exclude: [/glass onion/i]
	},
	{
		key: 'southdevonchilli',
		houseBrand: 'South Devon Chilli Farm',
		name: 'South Devon Chilli Farm',
		url: 'https://www.southdevonchillifarm.co.uk',
		// A chilli farm with a sauce line, not a sauce shop: the full catalogue is
		// 421 products of seeds, pot plants, growing kit and farm tours. The
		// collection holds all 25 sauces and nothing else.
		collection: 'sauces'
	},
	{
		key: 'onestopchilli',
		name: 'One Stop Chilli Shop',
		url: 'https://onestopchillishop.com'
	},
	{
		key: 'condimaniac',
		houseBrand: 'Condimaniac',
		name: 'Condimaniac',
		url: 'https://condimaniac.com'
	},
	{
		key: 'sauceshop',
		houseBrand: 'Sauce Shop',
		name: 'Sauce Shop',
		url: 'https://www.sauceshop.co'
	},
	{
		key: 'pipshotsauce',
		houseBrand: "Pip's Hot Sauce",
		name: "Pip's Hot Sauce",
		url: 'https://pipshotsauce.co.uk'
	},
	{
		key: 'sweetpepper',
		language: 'fr',
		name: 'Sweet Pepper',
		url: 'https://sweetpepper.fr'
	}
];

/** @type {import('./').WooScraperConfig[]} */
export const wooStores = [
	{
		key: 'heatsupply',
		name: 'Heatsupply',
		url: 'https://www.heatsupply.nl',
		description:
			'Do you love hot sauce? Then you are at the right place. Heatsupply has a wide and changing assortment of great hot sauces and other spicyness.',
		brandTaxonomy: 'pa_merk-hot-sauce',
		// Dutch by default; 203 of 307 descriptions came back in Dutch.
		lang: 'en'
	},
	{
		key: 'chilisausbe',
		name: 'Chilisaus.be',
		url: 'https://chilisaus.be',
		description: `We work with the Best Producers, to bring you The Best Chili Products
 Only products with Top Quality Ingredients pass the Chilisaus.be Acceptance Test
NEVER Products with Additives, Artificial Flavours or Colours
You will NOT find our Products in ANY Supermarkets!`
	},
	{
		key: 'dekkerpepper',
		language: 'nl',
		name: 'Dekker Pepper',
		url: 'https://www.dekkerpepper.nl'
	},
	{
		key: 'chardys',
		houseBrand: "Chardy's Hot Sauce",
		name: "Chardy's Hot Sauce",
		url: 'https://chardys.nl',
		// Mostly jam, chocolate and apparel; only this category is sauce.
		includeCategories: ['hot_sauce']
	},
	{
		key: 'hotta',
		name: 'Hotta',
		url: 'https://hotta.eu',
		// Estonian by default.
		lang: 'en',
		// Category slugs are translated too, so these must match `lang` above:
		// the Estonian `kastmed` is `sauces` once English is requested.
		includeCategories: ['sauces']
	},
	{
		key: 'hotsauceemporium',
		// 909 products, of which a quarter is gear, snacks, rubs and gift boxes.
		// Verified: nothing dropped by these categories is a sauce.
		includeCategories: ['hot-chilli-sauces', 'bbq-wing-marinades', 'british-sauces', 'hot-ones'],
		name: 'Hot Sauce Emporium',
		url: 'https://www.hotsauceemporium.co.uk'
	},
	{
		key: 'flowercityflavor',
		name: 'Flower City Flavor Company',
		url: 'https://flowercityflavor.com'
	},
	{
		key: 'hotsaucedepot',
		name: 'Hot Sauce Depot',
		url: 'https://hotsaucedepot.com'
	},
	{
		key: 'justchillies',
		houseBrand: 'Wiltshire Chilli Farm',
		name: 'Wiltshire Chilli Farm',
		url: 'https://justchillies.co.uk'
	},
	{
		key: 'chilirezept',
		language: 'de',
		// A German cooking shop as much as a sauce shop: pizza flour, yeast,
		// Damascus knives, a Bosch hand mixer, dried chillies. Its categories
		// separate them, and `senf` is kept on the same basis as mayo and BBQ.
		includeCategories: ['hot-sauce', 'sriracha', 'tabasco', 'grill-sauce', 'chili-extrakt', 'senf'],
		name: 'Chilirezept',
		url: 'https://shop.chilirezept.de'
	},
	{
		key: 'maisonpiquante',
		language: 'fr',
		name: 'Maison Piquante',
		url: 'https://maisonpiquante.com',
		// Every title carries a French flavour summary after an en dash:
		// "… Hot Sauce Angry Goat Pepper Co – Ail". It defeats cross-store dedup.
		stripFromName: /\s+[–—]\s+.*$/,
		// They also sell the Terre Exotique spice range, fresh chillies and
		// snacks. Their own categories separate these cleanly, which no keyword
		// list would: `epices-poivres-sels` alone is 30 peppers, salts and curry
		// blends. `condiment` is chilli oils, purées and mustards — kept, on the
		// same basis as mayo and BBQ.
		includeCategories: ['toutes-nos-sauces-pimentee', 'sauce-piment-douce', 'condiment']
	}
];
