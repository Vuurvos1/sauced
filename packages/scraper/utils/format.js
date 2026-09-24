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
	/\b(sold out|out of stock|back in stock)\b/gi,
	/[([]\s*heat\s*level[^)\]]*[)\]]/gi
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
 * Words that carry no brand identity, as one vocabulary.
 *
 * The same list is needed in three shapes — anchored to a raw title, anchored to
 * a normalised key, and unanchored anywhere in a key — and three hand-written
 * regexes drifted: the raw-text one was missing `limited`, `gmbh`, `bv` and the
 * plural `brands`, so those brands split in two. Building all three from one
 * source means they cannot disagree again.
 */
const NOISE_WORDS = {
	/** Legal and trading forms a shop appends to a brand. */
	corporate: [
		'co',
		'company',
		'ltd',
		'limited',
		'inc',
		'incorporated',
		'llc',
		'gmbh',
		'bv',
		'foods?',
		'brands?'
	],
	/** The product type itself: "Original Hot Sauce" names no maker. */
	type: ['hot\\s+sauces?', 'sauces?']
};

/** @param {string[]} words */
const alternation = (words) => `(${words.join('|')})`;

/** Anchored to the end of a name already put through `normalizeName`. */
const suffixOf = (words) => new RegExp(`\\s+${alternation(words)}$`);

/** Anywhere in a name already put through `normalizeName`. */
const anywhereIn = (words) => new RegExp(`\\b${alternation(words)}\\b`, 'g');

/** Anchored to the end of a raw title, which still has case and punctuation. */
const rawSuffixOf = (words) => new RegExp(`\\s+${alternation(words)}\\.?\\s*$`, 'i');

/**
 * Trade words a shop appends to its own name but leaves off its product titles.
 * `sauce co` is listed ahead of the parts so "High Desert Sauce Co" loses both
 * in the single pass this is used for.
 */
const TRADE_SUFFIX = rawSuffixOf(['sauce\\s+co', ...NOISE_WORDS.type, ...NOISE_WORDS.corporate]);

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

	// Shops punctuate a brand however they like — "Da Bomb", "Da' Bomb",
	// "Da'Bomb" — so match on the letters and let anything sit between them.
	const loose = (needle) =>
		needle
			.split(/[^\p{L}\p{N}]+/u)
			.filter(Boolean)
			.map(escapeRegExp)
			.join('[^\\p{L}\\p{N}]*');

	const attempt = (haystack, needle) => {
		const b = loose(needle);
		if (!b) return haystack;
		return (
			haystack
				.replace(new RegExp(`^\\s*${b}\\s*(?:[-–—:|,]\\s*)?`, 'iu'), '')
				.replace(new RegExp(`\\s*(?:[-–—:|,]\\s*)?${b}\\s*$`, 'iu'), '')
				// Some shops bury the brand mid-title: "Sauce Da'Bomb Beyond Insanity".
				.replace(new RegExp(`\\s+${b}\\s+`, 'iu'), ' ')
				.trim()
		);
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
 * "Heartbeat Hot Sauce Co." and "Heartbeat" are one maker.
 */
const CORP_SUFFIX = suffixOf(NOISE_WORDS.corporate);

/**
 * Deliberately not "chilli sauce" — the chilli is often part of the name, and
 * matching the pair reduced "Mic's Chilli Sauce" to "mic" while "Mic's Chilli"
 * stayed whole, splitting the brand in two.
 */
const TYPE_SUFFIX = suffixOf(NOISE_WORDS.type);

/** `normalizeName` turns "Marie Sharp's" into "marie sharp s". */
const POSSESSIVE_SUFFIX = /\s+s$/;

/**
 * Strips the given suffixes until none match, so "Heartbeat Hot Sauce Co" loses
 * both "co" and "hot sauce" — one pass alone leaves "heartbeat hot", because
 * the corporate suffix eats the "sauce" the type suffix needed.
 *
 * @param {string} value a normalised name
 * @param {RegExp[]} patterns
 */
function trimSuffixes(value, patterns) {
	let current = value;
	let previous;
	do {
		previous = current;
		for (const pattern of patterns) {
			const next = current.replace(pattern, '').trim();
			// Never trim a name to nothing: "Sauce Shop" and "K-Sauce" are brands,
			// not suffixes, and an empty key would merge every one of them.
			if (next.length >= 2) current = next;
		}
	} while (current !== previous);
	return current;
}

/**
 * The identity of a brand, with the spellings shops vary folded onto one key:
 * "Torchbearer Sauces", "TorchBearer" and "Torchbearer" all canonicalise the
 * same, as do "Marie Sharp" and "Marie Sharp's".
 *
 * @param {string | null | undefined} maker
 */
export function canonicalMakerName(maker) {
	return trimSuffixes(normalizeName(String(maker ?? '')), [
		CORP_SUFFIX,
		TYPE_SUFFIX,
		POSSESSIVE_SUFFIX
	]);
}

/**
 * The product type wherever a shop puts it, not only at the end: "Hot Sauce
 * Original" and "Sauce Red Habanero" lead with it, and "Steve-O's Hot Sauce
 * Butthole Destroyer" buries it in the middle.
 */
const TYPE_WORDS = anywhereIn(NOISE_WORDS.type);

/**
 * Punctuation that joins a word rather than separating one, in every quote mark
 * a shop might type. Dropped outright, so "Zuzu's" keys as "zuzus" and can meet
 * a shop that writes "Zuzus" — turning it into a space leaves a stray "s" token
 * that matches neither.
 */
const WORD_JOINERS = /['’‘`ʼ]/g;

/**
 * The identity of a sauce: the name with its brand and its product type removed,
 * so "Beyond Insanity", "Beyond Insanity Hot Sauce" and "Da Bomb – Beyond
 * Insanity" are one sauce.
 *
 * Order matters at every step:
 *
 * 1. fold accents, before the brand is stripped, so an accented spelling of the
 *    brand still matches — `stripMakerFromName` otherwise needs its own fallback,
 *    which only works when folding preserves length;
 * 2. remove the brand, which is why this needs the maker at all;
 * 3. lower case, and drop the apostrophes that join a word;
 * 4. remove the product type anywhere it appears;
 * 5. every other punctuation mark becomes a space, never nothing: deleting the
 *    hyphen in "Fire-Roasted" splits it from "Fire Roasted", one sauce;
 * 6. collapse runs of space and trim.
 *
 * The corporate and possessive suffixes are deliberately left alone — a sauce
 * may legitimately be called "Zuzu's" or "Soul Food".
 *
 * @param {string} name
 * @param {string | null | undefined} maker
 */
export function canonicalSauceName(name, maker) {
	const folded = foldAccents(String(name ?? ''));
	const withoutMaker = stripMakerFromName(folded, foldAccents(String(maker ?? '')));
	const withoutType = withoutMaker.toLowerCase().replace(WORD_JOINERS, '').replace(TYPE_WORDS, ' ');
	// A sauce called nothing but its type keeps its name rather than becoming "",
	// which would merge every such listing a maker sells.
	return normalizeName(withoutType) || normalizeName(withoutMaker);
}

/**
 * The key two listings must share to be the same sauce. Equality, not a score:
 * fuzzy matching a name against every other name merged "Habanero" with 88
 * unrelated products, because fuzzysort ranks subsequences for a search box.
 *
 * A listing whose shop names no brand is keyed to its store, so it stays its own
 * sauce rather than merging into whichever name it happens to resemble.
 *
 * @param {string} name
 * @param {string | null | undefined} maker
 * @param {string} [storeKey] used in place of an unknown maker
 */
export function sauceDedupKey(name, maker, storeKey = '') {
	return `${canonicalMakerName(maker) || `?${storeKey}`} :: ${canonicalSauceName(name, maker)}`;
}
