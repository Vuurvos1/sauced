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
		.replace(/ +/g, '-'); // replace one or more spaces with single hyphen
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
