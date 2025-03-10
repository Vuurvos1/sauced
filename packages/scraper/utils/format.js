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
 * @param {string} name
 */
export function normalizeName(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]/g, ' ') // replace special chars with space
		.replace(/\s+/g, ' ') // replace one or more spaces with single hyphen
		.trim();
}

/**
 * @param {string} name
 */
export function slugifyName(name) {
	return name
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
	const result = fuzzysort.single(name1, name2);
	return result ? result.score > threshold : false;
}
