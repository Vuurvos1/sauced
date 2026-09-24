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

/**
 * Brands a shop files under another name. Applied to every store, because the
 * same alias turns up in several: Spicin' Foods is Da Bomb's parent company and
 * three shops credit it instead of the brand, which stopped four listings of
 * Beyond Insanity from deduplicating.
 */
export const makerAliases = {
	"Spicin' Foods": 'Da Bomb',
	'Spicin Foods': 'Da Bomb'
};

/**
 * Sauces one maker sells under two names that share no words, so no rule can
 * merge them: Heatsupply lists Raijmakers by flavour ("Carolina Reaper &
 * Ginger") while Some Like It Hot lists the same bottle by product name ("Brain
 * Buzzer"). The first name defines the shared identity; the stored name is then
 * picked by the usual rule (most shops, shortest), which lands on that first
 * name for every entry here.
 *
 * Curated on purpose. The signal that finds these — a listing's copy opening
 * with another of the maker's product names — was measured at roughly 75%
 * accurate over the catalogue, and would merge Valentina's Black Label into its
 * Original and three Secret Aardvark sauces into one. Every entry below was
 * confirmed by reading both descriptions.
 */
export const sauceAliases = [
	{ maker: 'Raijmakers Heetmakers', names: ['Brain Buzzer Hot Sauce', 'Carolina Reaper & Ginger'] },
	{
		maker: 'Raijmakers Heetmakers',
		names: ['Heat Enhancer Hot Sauce', 'Chipotle & Whiskey – Best Dutch Hot Sauce 2024']
	},
	{ maker: 'Raijmakers Heetmakers', names: ['Tranquilizer Hot Sauce', 'Habanero & Sweet Potato'] },
	// Mic's reorders the words; two shops each pick a different order.
	{ maker: "Mic's Chilli", names: ['Inferno Sauce Original', 'Inferno Original Habanero Sauce'] },
	{ maker: "Mic's Chilli", names: ['Inferno Sauce Lite', 'Inferno Lite Habanero Sauce'] },
	{ maker: "Mic's Chilli", names: ['Inferno Sauce Extreme', 'Inferno Extreme Habanero Sauce'] },
	{ maker: "Mic's Chilli", names: ['Inferno Sauce Junior', 'Inferno Junior Habanero Sauce'] },
	{ maker: "Mic's Chilli", names: ['Voodoo Reaper Sauce', 'Voodoo Reaper Damn Hot Sauce'] },
	{ maker: "Mic's Chilli", names: ['Trouble In Trinidad', 'Trouble In Trinidad Damn Hot Sauce'] },
	{ maker: "Mic's Chilli", names: ['Naga Knockdown Sauce', 'Naga Knockdown Damn Hot Sauce'] },
	{ maker: "Mic's Chilli", names: ['Emerald Jalapeno Sauce', 'Emerald Jalapeno Damn Hot Sauce'] },
	{ maker: 'Torchbearer Sauces', names: ['Oh My Garlic', 'Oh My Garlic - Creamy Garlic Sauce'] },
	{ maker: 'Torchbearer Sauces', names: ['Habanero Evil', 'Habanero Evil - Medium Hot Sauce'] },
	{
		maker: 'High River Sauces',
		names: ['Foo Foo Mama Choo', 'Foo Foo Mama Choo Carolina Reaper Sauce']
	},
	{ maker: 'Hellfire', names: ['Fiery Fool', 'Fiery Fool “Hottest sauce in the world”'] },
	{ maker: 'Butterfly Bakery', names: ['Mellow Vibes', 'Mellow Vibes Only'] },
	{ maker: "Dirty Dick's", names: ['Peachy Green', "Dick's Peachy Green"] }
];

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
		// `stripFromName: /\s*\|[\s\S]*$/` reads better and helps cross-store dedup.
		// It used to collapse 8 sauces onto colliding slugs, because different makers
		// share a product name; migration 0007 made `hot_sauces` unique per
		// (maker, name) and the slug disambiguates with the brand, so this is now
		// safe to enable — worth measuring the merge it buys before turning on.
	},
	{
		key: 'scovello',
		language: 'nl',
		// 80% of its descriptions came back Dutch and its feed serves no English.
		// 56 of its 80 listings are sold nowhere else, so those are dropped with it.
		disabled: true,
		name: 'Scovello',
		url: 'https://scovello.nl'
	},
	{
		key: 'sausmetpit',
		// Publishes Dutch throughout: without this it counted as English and its
		// copy replaced real English descriptions on the Crazy Bastard and Tabasco
		// sauces that five other shops also stock.
		language: 'nl',
		// Dutch on every judged listing; 10 of 17 are sold nowhere else.
		disabled: true,
		name: 'Saus Met Pit',
		url: 'https://www.sausmetpit.nl',
		// Also stocks crisps and noodles under these brands.
		excludeVendors: ['Takis', 'Hot Chip EU', 'Santa Maria']
	},
	{
		key: 'raijmakers',
		language: 'nl',
		// Dutch on every judged listing. Only 1 of its 5 is exclusive — the rest
		// reach us through Heatsupply, in English.
		disabled: true,
		name: 'Raijmakers Heetmakers',
		url: 'https://shop.raijmakersheetmakers.com',
		// The feed still carries Shopify's default vendor, so fall back to the brand.
		houseBrand: 'Raijmakers Heetmakers'
	},
	{
		key: 'redhotfoods',
		name: 'Red Hot Foods',
		url: 'https://www.redhotfoods.de',
		// Aisles only this shop has. Chamoy is left in — it is a sauce.
		excludeCategories: ['olive oil', 'pizza topping', 'fruit bowl', 'skewers', 'burger press'],
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
		excludeCategories: ['drink mix'],
		// Their own line ships under an internal warehouse name.
		renameMakers: { 'Pepper Palace Warehouse': 'Pepper Palace' }
	},
	{
		key: 'torchbearer',
		excludeCategories: ['mustard'],
		houseBrand: 'Torchbearer Sauces',
		name: 'Torchbearer Sauces',
		url: 'https://www.torchbearersauces.com'
	},
	{
		key: 'somelikeithot',
		// The .shop registry answers NXDOMAIN for the domain as of 2026-09-24, so
		// it has lapsed or been suspended. Re-enable if it resolves again.
		disabled: true,
		name: 'Some Like It Hot',
		url: 'https://somelikeithot.shop',
		excludeCategories: ['keto bone broth', 'pesto'],
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
		url: 'https://onestopchillishop.com',
		// It also sells Rwandan groceries. `avodado` is the shop's own typo, kept
		// verbatim because the filter matches what the feed actually says.
		excludeCategories: [
			'tea',
			'cassava',
			'avodado',
			'avocado',
			'uncategorized',
			'salted caramel',
			'dried chillies'
		]
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
		// Its mayo is filed as such but named "Burger Sauce", so only the category
		// gives it away.
		excludeCategories: ['mayonnaise'],
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
		// Off until dedup handles French catalogues: its titles carry the brand
		// ("Hot Zeg - Adixion 🥭") and near-misses like Adixion/Adixxion fall under
		// the fuzzy threshold, so its rows duplicate sauces other shops already list.
		disabled: true,
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
		excludeCategories: ['packs'],
		// Fried toppings filed beside the chilli oils they are sold with. The
		// category cannot separate them and `crispy` matches 23 products here, all
		// but these two an oil, so they are named.
		exclude: [/crispy jalape[nñ]os\s*$/i, /crispy macha\s*$/i],
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
		// Dutch on every judged listing, and all 34 are sold nowhere else.
		disabled: true,
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
		// Two multi-bottle sets its feed describes exactly like a single sauce:
		// `type: simple`, no tags, no attributes, an empty description, and a price
		// below the single Truff sauce beside them. They sit in `gifts-and-gear`,
		// but so do the only two Truff sauces in the catalogue, so excluding that
		// category costs more than it saves. Named here because nothing else tells
		// them apart — what gives them away is only on the product page.
		exclude: [/sultans of sizzle/i, /ass blaster\s*&\s*outhouse/i],
		// 909 products, of which a quarter is gear, snacks, rubs and gift boxes.
		// Verified: nothing dropped by these categories is a sauce.
		includeCategories: ['hot-chilli-sauces', 'bbq-wing-marinades', 'british-sauces', 'hot-ones'],
		name: 'Hot Sauce Emporium',
		url: 'https://www.hotsauceemporium.co.uk'
	},
	{
		key: 'flowercityflavor',
		// Its image host answers 403 to everything, with or without a Referer — so
		// this is bot blocking, not hotlink protection, and nothing we send fixes it.
		// All 287 of its exclusive listings showed a broken image; the other 178 are
		// stocked elsewhere and keep working images without it.
		disabled: true,
		name: 'Flower City Flavor Company',
		url: 'https://flowercityflavor.com'
	},
	{
		key: 'hotsaucedepot',
		// These sit in a sauce category too, so the shared allowlist keeps them —
		// only the shop's own list can say a bulk tub is not another sauce.
		excludeCategories: ['bulk', 'collectible', 'gift-sets'],
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
		// 91% German and no English feed; 45 of its 49 listings are exclusive.
		disabled: true,
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
		// Off for the same reason as Sweet Pepper. It serves no English translation,
		// so its descriptions are French-only on sauces five other shops also stock.
		disabled: true,
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
