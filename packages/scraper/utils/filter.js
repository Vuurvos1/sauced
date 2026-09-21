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
	// A "Lover's Bag - BBQ Sauces" is a bundle and a drawstring bag is merch.
	/\bbags?\b/i,
	/\b(playing cards?|card deck|\d+-card)\b/i,
	/(speelkaarten|pokerkaarten)/i
];

/** Living produce and growing kit — chilli farms shelve these next to the sauce. */
const GROWING_PATTERNS = [
	// Plural only: "Seed Ranch" and "Fire Seed Mustard" are sauce brands.
	/\b(seeds|zaden|graines|semences|seedlings?|propagator|plant food)\b/i,
	/\bpot plant\b/i,
	/\bplants?\b(?!\s*based)/i,
	/\bfresh\s+[\w\s]*chill?ies\b/i
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
	/\bmosselen\b/i
];

/** Powders, rubs and seasonings: chilli products, but not a bottle of sauce. */
const DRY_GOODS_PATTERNS = [
	/\b(powder|poeder|pulver)\b/i,
	/\brubs?\b/i,
	/\b(seasoning|gewurz\w*|epices?)\b/i,
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
	/\b(peanuts?|pretzels?|bread|cookies?|biscuits?)\b/i
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
	return [...ALCOHOL_PATTERNS, ...CONFECTIONERY_PATTERNS, ...UTENSIL_PATTERNS].some((pattern) =>
		pattern.test(folded)
	);
}

/**
 * @param {string | null | undefined} name
 * @param {RegExp[]} [exclude] store-specific patterns from the scraper config
 */
export function shouldSkipProduct(name, exclude = []) {
	if (isBundleName(name)) return true;
	return exclude.some((pattern) => pattern.test(String(name)));
}
