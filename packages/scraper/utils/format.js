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

/** Trade words a shop appends to its own name but leaves off its product titles. */
const TRADE_SUFFIX =
	/\s+(hot\s+sauces?|sauces?|sauce\s+co\.?|co\.?|company|ltd\.?|inc\.?|llc|foods?|brand)\s*$/i;

/** @param {string} value */
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes the maker from the front or back of a product title, so "Queen Majesty
 * - Scotch Bonnet & Ginger" and "Scotch Bonnet & Ginger Hot Sauce" become the
 * same sauce. 36% of scraped titles carry the brand, spelled differently per
 * shop, and it is the single biggest cause of cross-store duplicates.
 *
 * @param {string} name
 * @param {string | null | undefined} maker
 */
export function stripMakerFromName(name, maker) {
	const title = String(name ?? '').trim();
	const brand = String(maker ?? '').trim();
	if (!brand || !title) return title;

	const attempt = (haystack, needle) => {
		const b = escapeRegExp(needle);
		return haystack
			.replace(new RegExp(`^\\s*${b}\\s*(?:[-–—:|,]\\s*)?`, 'i'), '')
			.replace(new RegExp(`\\s*(?:[-–—:|,]\\s*)?${b}\\s*$`, 'i'), '')
			.trim();
	};

	let stripped = attempt(title, brand);

	// A shop often registers the brand with its trade suffix ("Queen Majesty Hot
	// Sauce") while titling the product without it ("Queen Majesty Cocoa Ghost").
	if (stripped === title) {
		const shortened = brand.replace(TRADE_SUFFIX, '').trim();
		if (shortened.length >= 3 && shortened !== brand) stripped = attempt(title, shortened);
	}

	// Shops spell the brand with different accents; fold both to compare, but only
	// when folding preserves length, so offsets into the original stay valid.
	if (stripped === title && foldAccents(title).length === title.length) {
		const folded = attempt(foldAccents(title), foldAccents(brand));
		if (folded !== foldAccents(title)) {
			const start = foldAccents(title).indexOf(folded);
			if (start >= 0) stripped = title.slice(start, start + folded.length).trim();
		}
	}

	// A sauce named only after its maker keeps its name — as does one left with
	// nothing but punctuation or an emoji ("Valentina ❤️" minus "Valentina"),
	// which would otherwise slugify to an empty string.
	return /[a-z0-9]/i.test(foldAccents(stripped)) ? stripped : title;
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
