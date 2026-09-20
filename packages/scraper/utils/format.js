import fuzzysort from 'fuzzysort';

/**
 * @param {number} num
 */
export function formatNumber(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * @param {string} description
 */
export function formatDescription(description) {
	return description.replace(/^"|"$/g, '');
}

/**
 * Letters that carry no combining mark to strip, so NFD leaves them alone.
 * Mapped the way Postgres' unaccent() maps them, to keep the scraper's dedup
 * and the site's search agreeing on what counts as the same name.
 */
const LIGATURES = { ø: 'o', ł: 'l', ß: 'ss', æ: 'ae', œ: 'oe', đ: 'd', ð: 'd', þ: 'th' };

/**
 * Folds accents onto their base letter ("ñ" -> "n"). Has to happen before the
 * non-alphanumeric cleanup below, which would otherwise treat the accent as
 * punctuation and split the word ("habañero" -> "haba ero").
 *
 * @param {string} name
 */
export function foldAccents(name) {
	return name
		.normalize('NFD') // split "ñ" into "n" + combining tilde
		.replace(/[\u0300-\u036f]/g, '') // drop the combining marks
		.replace(/[øłßæœðþđ]/gi, (c) => {
			const folded = LIGATURES[c.toLowerCase()];
			return c === c.toLowerCase() ? folded : folded.toUpperCase();
		});
}

/**
 * Trailing size, as shops append it: "… 148ml", "…, 8oz", "… | 250g |".
 * Not anchored, because it also turns up mid-name between separators.
 */
const SIZE = /\b\d+([.,]\d+)?\s*(ml|cl|kg|g|oz|lb|l|litre|liter|ltr)\b/gi;

/** Shop copy that is not part of the product name. */
const PROMO = [
	/\*\*[^*]+\*\*/g, // **LAST CHANCE TO BUY**
	/\*[^*]+\*/g, // *REDUCED*
	/\s*[-–—]\s*buy now!?\s*$/gi,
	/\(\s*pre[- ]?order\s*\)/gi,
	/\[\s*pre[- ]?order\s*\]/gi,
	/\b(sold out|out of stock|back in stock)\b/gi
];

/** Separators and punctuation left stranded once a fragment is removed. */
function tidySeparators(name) {
	return name
		.replace(/\s*([|:,–—-])\s*\1+/g, ' $1 ')
		.replace(/^[\s|:,–—-]+/, '')
		.replace(/[\s|:,–—-]+$/, '')
		.replace(/\(\s*\)/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/**
 * Strips the size and any promotional copy a shop baked into the product title,
 * so the stored name is the sauce and nothing else.
 *
 * @param {string} name
 */
export function cleanProductName(name) {
	let cleaned = String(name ?? '');
	// Leading marker some shops use to flag a range, e.g. "*PSYCHO JUICE".
	cleaned = cleaned.replace(/^\s*\*(?!\*)/, '');
	for (const pattern of PROMO) cleaned = cleaned.replace(pattern, ' ');
	cleaned = cleaned.replace(SIZE, ' ');
	const tidied = tidySeparators(cleaned);
	// Never strip a name down to nothing — keep the original if we would.
	return tidied || String(name ?? '').trim();
}

/**
 * @param {string} name
 */
export function normalizeName(name) {
	return foldAccents(name)
		.toLowerCase()
		.replace(/[^a-z0-9]/g, ' ') // replace special chars with space
		.replace(/\s+/g, ' ') // replace one or more spaces with single hyphen
		.trim();
}

/**
 * @param {string} name
 */
export function slugifyName(name) {
	return foldAccents(name)
		.toLowerCase() // convert to lowercase first
		.replace(/[^a-z0-9 ]/g, '') // remove all non-alphanumeric chars except spaces
		.trim() // emoji leave a stranded space that would become a hyphen
		.replace(/ +/g, '-');
}

/**
 * @param {string} existingName
 * @param {string} newName
 * @param {number} threshold - Similarity score threshold [1, 0]: 1 is a perfect match. 0.5 is a good match. 0 is no match.
 */
export function isSimilarName(existingName, newName, threshold = 0.6) {
	const name1 = normalizeName(existingName);
	const name2 = normalizeName(newName);
	const result1 = fuzzysort.single(name1, name2);
	const result2 = fuzzysort.single(name2, name1);
	const bestScore = Math.max(result1?.score ?? -Infinity, result2?.score ?? -Infinity);
	return bestScore > threshold;
}
