/**
 * The JSON storefront APIs return descriptions as HTML fragments and titles with
 * entity-encoded punctuation, so both need flattening before they reach the db.
 */

/** Only the entities that actually show up in product copy. */
const NAMED_ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	hellip: '…',
	mdash: '—',
	ndash: '–',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
	deg: '°',
	eacute: 'é',
	egrave: 'è',
	uuml: 'ü',
	ouml: 'ö',
	auml: 'ä',
	ntilde: 'ñ'
};

/**
 * @param {string} str
 */
export function decodeEntities(str) {
	return str
		.replace(/&#(\d+);/g, (match, dec) => {
			const code = Number(dec);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
		})
		.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
			const code = parseInt(hex, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
		})
		.replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Flattens an HTML fragment to plain text. Block-level tags become newlines so
 * multi-paragraph descriptions don't run together into one word.
 *
 * @param {string | null | undefined} html
 */
export function stripHtml(html) {
	if (!html) return '';

	const text = html
		.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|tr|h[1-6]|blockquote)\s*>/gi, '\n')
		.replace(/<[^>]*>/g, '');

	return decodeEntities(text)
		.replace(/\r/g, '')
		.replace(/[ \t ]+/g, ' ')
		.replace(/ *\n */g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
