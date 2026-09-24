import { foldAccents } from './format.js';

/**
 * Storefront catalogues carry more than sauce: multipacks, subscriptions, gift
 * boxes and merch. Those are not distinct sauces, so they are dropped before a
 * product ever becomes a row.
 *
 * Patterns are multilingual because the Dutch, German and French stores name
 * their bundles in their own language — an English-only list let ~140 through.
 */
const BUNDLE_PATTERNS = [
	/\b\d+\s*[-x]?\s*packs?\b/i,
	/\b(packs?|trio|duo|combo|bundle|variety)\b/i,
	/\bgift\s*(sets?|packs?|box(es)?|cards?|bags?)\b/i,
	/\bgift(set|pack)s?\b/i,
	/\b(sauce|selection|tasting|spicy)\s*box\b/i,
	/\bmystery\b/i,
	/\b(monthly|subscription|membership|challenge|collection)\b/i,
	/\bclub\b/i,
	/\bof the month\b/i,
	// "PSYCHO JUICE Chipotle Ghost Pepper x 2 bottles", "HOT BOX - x3 Hottest".
	/\bx\s*\d+\b/i,
	/\b\d+\s*bottles?\b/i,
	/\bbox(es)?\b/i,
	// A catering tub is a size of a sauce we already list, not another sauce.
	/\bcatering\b/i,
	/\b(voucher|e-?gift)\b/i,
	/year of hot ones/i,
	// Language-agnostic: "Case of 12", "6 x 200ml", "12 x 5oz".
	/\bcase of\b/i,
	/\b\d+\s*gallon\b/i,
	/\bbucket\b/i,
	/\b\d+\s*x\s*\d+/i,
	/\bset of\b/i,
	/\b\d+\s*er\s+set\b/i,
	/\bsets?\b(?!\s*(the|a)\b)/i,
	// nl / de / fr
	// Dutch compounds them: "peperpakket", "proefpakket".
	/(pakket|geschenk|cadeau|kado|bundel|voordeel|kookboek)/i,
	/\b(coffret|assortiment|carte cadeau)\b/i,
	/\bmelange\s+d/i,
	/\b(adventskalender|probierset|geschenkset|paket)\b/i
];

/** Merch and hardware that shops shelve alongside the sauce. */
const MERCH_PATTERNS = [
	/\b(socks?|sokken|t-?shirts?|hoodies?|sweater|longsleeve|long sleeve|trui|beanie|cap|hat)\b/i,
	// `glass` alone would take "Hot Sauce - Glass Onion".
	/\b(mugs?|mokken?|glassware|coasters?|onderzetters?|apron|schort|opener)\b/i,
	/\b(messer\w*|couteau\w*|knife|knives|besteck|cutlery)\b/i,
	/\b(ladle|whisk|ramekins?|keyrings?|key ?chain|grinders?)\b/i,
	// Dutch compounds again: "Honinglepel".
	/(lepel)/i,
	/\b(spoon|spatula|pens?)\b/i,
	/\b(stickers?|poster|keychain|magnet|tote|pin|badge|calendar|tea\s*towel|notepad|notebook)\b/i,
	/\b(bobble ?head|collectible|bandana|matchbook|koozie)\b/i,
	// A "Lover's Bag - BBQ Sauces" is a bundle and a drawstring bag is merch.
	/\bbags?\b/i,
	/\b(playing cards?|card deck|\d+-card)\b/i,
	/(speelkaarten|pokerkaarten)/i
];

/**
 * Books. Not guarded by `IS_A_SAUCE`, because a cookbook about hot sauce still
 * says "sauce" — "HOT SAUCE - The hot sauce bible with 40 spicy recipes" is a
 * book. Singular "recipe" is deliberately absent: it takes "Mama's Own Recipe",
 * which is a chilli oil.
 */
const BOOK_PATTERNS = [
	/\b(cook ?books?|kochbuch|kookboek)\b/i,
	/\bbooks?\b/i,
	/\bbible\b/i,
	/\bguide\b/i,
	/\brecipes\b/i
];

/** Living produce and growing kit — chilli farms shelve these next to the sauce. */
const GROWING_PATTERNS = [
	// Plural only: "Seed Ranch" and "Fire Seed Mustard" are sauce brands.
	/\b(seeds|zaden|graines|semences|seedlings?|propagator|plant food)\b/i,
	/\bpot plant\b/i,
	/\bplants?\b(?!\s*based)/i,
	/\bfresh\s+[\w\s]*chill?ies\b/i,
	// "Whole Carolina Reaper Pods", "Scotch Bonnet Pods (100,000-350,000 SHU)".
	/\bpods?\b/i
];

/**
 * Food that is not sauce. Deliberately excludes mayo, ketchup, mustard and BBQ,
 * which are close enough to belong in the catalogue.
 */
const NOT_SAUCE_PATTERNS = [
	// "Rings" plural only: "RING STINGER" is a sauce.
	/\b(chips|crisps|kartoffelchips|popcorn|gumm(y|ies)|jerky|bonbons?|snoep|rings)\b/i,
	/\b(kruidenmix|specerijen)\b/i,
	/\b(ketjap|kecap|sojasaus|soy sauce|vissaus|fish sauce)\b/i,
	// Coffee beans are not sauce; "Coffee BBQ Sauce" and "Coffee Date hot sauce" are.
	/\b(coffee|koffie)\s+(beans?|grounds?|pods?)\b/i,
	/\b(medium|dark|light)\s+roast\b/i,
	/\bpsycho coffee\b/i,
	/\bmosselen\b/i,
	/\bfish fry\b/i,
	/\bmeat sticks?\b/i,
	/\bsoups?\b/i,
	/\b(noodles?|ramen|udon)\b/i,
	/\bbroth\b/i
];

/** Powders, rubs and seasonings: chilli products, but not a bottle of sauce. */
const DRY_GOODS_PATTERNS = [
	/\b(powder|poeder|pulver)\b/i,
	/\brubs?\b/i,
	/\b(seasoning|gewurz\w*|epices?)\b/i,
	/\bspice\s*mix(es)?\b/i,
	/\b(poudre|poeder)\b/i,
	/\b(flakes|vlokken)\b/i,
	/\bdried\b(?!.*\bsauce\b)/i,
	/\bsech(e|ee|es|ees)\b(?!.*\bsauce\b)/i,
	/\bgedroogd\w*\b(?!.*\b(saus|sauce)\b)/i
];

/**
 * Checkout line items shops list as products: shipping, deposits, donations.
 * Anchored words only — a bare `tip` would take "Blacktip Widow Hot Sauce".
 */
const FEE_PATTERNS = [
	/\b(shipping|postage|carriage|delivery)\b/i,
	/\b(livraison|expedition|frais de port)\b/i,
	/\b(verzendkosten|versandkosten|statiegeld|pfand)\b/i,
	/\b(donation|gift ?aid|deposit)\b/i
];

/**
 * Bottled alcohol. Only applied when the product is not itself a sauce, because
 * these read as flavours just as often: "Irish Whiskey BBQ Sauce",
 * "Caribbean Rum Hot Sauce".
 */
const ALCOHOL_PATTERNS = [
	/\b(spirits?|gin|vodka|whisk(e)?y|rum|liqueur|likeur|bier|beer|wijn|wine)\b/i
];

/**
 * Confectionery. Guarded like alcohol: "Chocolate Habanero" is a pepper variety
 * and "Salted Caramel BBQ Sauce" is a sauce, so only drop these when the product
 * does not call itself one.
 */
const CONFECTIONERY_PATTERNS = [
	/\b(fudge|caramels?|toffee|marshmallows?|nougat|truffles?)\b/i,
	/\b(chocolate|chocolat|schokolade)\b/i,
	/\b(peanuts?|pretzels?|bread|cookies?|biscuits?)\b/i,
	/\b(rolls?|buns?|crispbread|crackers?)\b/i
];

/**
 * Condiments that are not chilli sauce. Guarded by `IS_A_SAUCE`, because
 * "Mustard Glen Hot Sauce" and "Fire Seed Mustard Hot Sauce" are hot sauces that
 * merely taste of mustard.
 */
const CONDIMENT_PATTERNS = [
	/\bmayo(nnaise)?\b/i,
	/\b(ketchup|catsup)\b/i,
	/\b(mustard|senf|moutarde|mosterd)\b/i
];

/**
 * Chilli products that are not pourable sauce. Guarded, so "Pain Is Good Sambal
 * Hot Sauce" survives while "Cayenne Chilli Paste" does not.
 */
const NOT_POURABLE_PATTERNS = [
	/\bsalts?\b/i,
	/\b(fleur de sel|sel de)\b/i,
	/\b(puree|pastes?)\b/i,
	/\bmole\b/i
];

/**
 * Kitchenware whose words also turn up in sauce names — "Hot Rod", "Board" —
 * so only drop them when the product does not call itself a sauce.
 */
const UTENSIL_PATTERNS = [/\b(rods?|forks?|boards?|trays?|scoops?|tongs?|peelers?)\b/i];

/** Says the product is a sauce, whichever language the shop sells in. */
const IS_A_SAUCE = /\b(sauces?|saus|sos|salsa)\b/i;

const ALWAYS_PATTERNS = [
	...BUNDLE_PATTERNS,
	...MERCH_PATTERNS,
	...GROWING_PATTERNS,
	...BOOK_PATTERNS,
	...NOT_SAUCE_PATTERNS,
	...DRY_GOODS_PATTERNS,
	...FEE_PATTERNS
];

/**
 * @param {string | null | undefined} name
 * @returns {boolean} true when the product is a bundle, subscription or merch
 */
export function isBundleName(name) {
	if (!name) return true;

	// Patterns are written in ASCII and matched against the folded name: JS `\b`
	// only knows [A-Za-z0-9_], so `\bepices\b` never fires against "d'épices".
	const folded = foldAccents(String(name));

	if (ALWAYS_PATTERNS.some((pattern) => pattern.test(folded))) return true;
	if (IS_A_SAUCE.test(folded)) return false;
	return [
		...ALCOHOL_PATTERNS,
		...CONFECTIONERY_PATTERNS,
		...UTENSIL_PATTERNS,
		...CONDIMENT_PATTERNS,
		...NOT_POURABLE_PATTERNS
	].some((pattern) => pattern.test(folded));
}

/**
 * A bundle whose name gives nothing away — "BBQ Bundaroo!" has no category, no
 * tags and an empty product type — still lists its contents in its copy.
 *
 * Only "includes:" is used. "contains:" reads as an allergen statement on 13
 * real sauces, and counting sauces in the text takes marketing copy such as
 * "an extraordinary duo of hot sauces" and "top three best Hot Sauces".
 */
const BUNDLE_DESCRIPTION_PATTERNS = [/\bincludes:/i];

/**
 * @param {string | null | undefined} description
 * @returns {boolean} true when the copy enumerates the products inside
 */
export function isBundleDescription(description) {
	if (!description) return false;
	const folded = foldAccents(String(description));
	return BUNDLE_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(folded));
}

/**
 * @param {string | null | undefined} name
 * @param {RegExp[]} [exclude] store-specific patterns from the scraper config
 * @param {string | null | undefined} [description] the shop's product copy
 */
export function shouldSkipProduct(name, exclude = [], description = null) {
	if (isBundleName(name)) return true;
	if (isBundleDescription(description)) return true;
	return exclude.some((pattern) => pattern.test(String(name)));
}

/**
 * Shops file their own products, and that is better evidence than a name: the
 * title "OKTOBERFEST" says nothing, while its category `seasonings-and-spices`
 * says everything. Shopify supplies `product_type`, WooCommerce its category
 * slugs and names.
 */

/** A category naming the product a sauce outranks every other it also sits in. */
const SAUCE_CATEGORY = [
	/\bhot[-\s]?chill?i?[-\s]?sauces?\b/i,
	/\bhot[-\s]?sauces?\b/i,
	/\bchill?i[-\s]?sauces?\b/i,
	/\bwing[-\s]?sauces?\b/i,
	/\bbbq[-\s]?sauces?\b/i,
	/\bsalsa\b/i,
	/\bhot[-\s]?ones\b/i,
	/british[-\s]sauces/i,
	// Bare "Sauces" as a whole category name, not "Mustard Sauce".
	/^\s*sauces?\s*$/i
];

/**
 * What the product *is*. A sauce-sounding name cannot overrule a gift box —
 * "Melinda's Hot Sauce Mini's Box" is still a box.
 */
const BLOCKED_FORM_CATEGORY = [
	/\bgifts?\b|giftset|gift[-\s]?(pack|set|box|card)/i,
	/\bbundles?\b|\bpacks?\b|case pack|\btrio\b|\bduo\b/i,
	/merch|t-?shirt|apparel|clothing|\bhats?\b|beanie|koozie|\bmugs?\b/i,
	/collectible/i,
	/freebie|voucher/i,
	/\bbulk\b|catering|wholesale/i,
	/grinder/i,
	/\bcook ?books?\b|\bbooks?\b|magazine/i
];

/**
 * What the product is *made of*. Here the name wins, because shops shelve a
 * sauce in a neighbouring aisle all the time — Angry Goat's BBQ sauce sits under
 * "Chilli Jam", and Marie Sharp's Cactus Habanero Sauce under "Rubs".
 */
const BLOCKED_TYPE_CATEGORY = [
	/snack|nibble|candy|sweets|taffy/i,
	/season|\brubs?\b|\bspices?\b/i,
	/powder|flakes/i,
	/\bjams?\b|preserve|chutney|relish|marmalade/i,
	/puree|paste/i,
	/fresh[-\s]chill?i|\bpods?\b/i,
	/chocolate|cheese/i,
	/pickle/i,
	// Singular only: the plural is how brands name themselves — "Fire Foods" is a
	// sauce maker, and matching it dropped eleven of its sauces.
	/\bfood\b/i,
	/\bmiso\b/i
];

const matchesAny = (labels, patterns) =>
	labels.some((label) => label.trim() && patterns.some((pattern) => pattern.test(label)));

/**
 * @param {string[]} labels the shop's own categories or product type
 * @param {string | null | undefined} name the product title, as a tiebreaker
 * @param {string[]} [excludeCategories] extra aisles from the scraper config
 * @returns {boolean} true when the shop files this somewhere that is not sauce
 */
export function isExcludedCategory(labels, name, excludeCategories = []) {
	const folded = labels.map((label) => foldAccents(String(label ?? '')));
	if (folded.every((label) => !label.trim())) return false;

	// A shop's own list is a deliberate statement about its own aisles, so it wins
	// over every shared rule below, including the sauce allowlist.
	const wanted = excludeCategories.map((category) => category.toLowerCase());
	if (folded.some((label) => wanted.some((category) => label.toLowerCase().includes(category)))) {
		return true;
	}

	if (matchesAny(folded, SAUCE_CATEGORY)) return false;

	if (matchesAny(folded, BLOCKED_FORM_CATEGORY)) return true;
	if (!matchesAny(folded, BLOCKED_TYPE_CATEGORY)) return false;
	return !IS_A_SAUCE.test(foldAccents(String(name ?? '')));
}
