/**
 * Storefront catalogues carry more than sauce: multipacks, subscriptions, gift
 * boxes and merch. Those are not distinct sauces, so they are dropped before a
 * product ever becomes a row.
 */
const BUNDLE_PATTERNS = [
	/\b\d+\s*[-x]?\s*packs?\b/i,
	/\b(packs?|trio|duo|combo|bundle|variety)\b/i,
	/\bgift\s*(sets?|packs?|box(es)?|cards?|bags?)\b/i,
	/\bgift(set|pack)s?\b/i,
	/\b(sauce|selection|mystery|tasting)\s*box\b/i,
	/\b(monthly|subscription|membership|challenge|collection)\b/i,
	/\b(voucher|e-?gift)\b/i,
	/\b(socks|t-?shirts?|hoodies?|sweater|beanie|cap|hat|mugs?|glassware|stickers?|apron|poster|keychain|magnet|tote|bags?|pin|badge|calendar|tea\s*towel)\b/i,
	/year of hot ones/i
];

/**
 * @param {string | null | undefined} name
 * @returns {boolean} true when the product is a bundle, subscription or merch
 */
export function isBundleName(name) {
	if (!name) return true;
	return BUNDLE_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * @param {string | null | undefined} name
 * @param {RegExp[]} [exclude] store-specific patterns from the scraper config
 */
export function shouldSkipProduct(name, exclude = []) {
	if (isBundleName(name)) return true;
	return exclude.some((pattern) => pattern.test(String(name)));
}
