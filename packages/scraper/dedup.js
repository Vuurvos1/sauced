/**
 * Resolving which listings are the same sauce, with no database in sight.
 *
 * The rule is one deterministic key per sauce, compared with `===`. It replaces
 * a fuzzy scan of every stored name against every scraped name: fuzzysort ranks
 * subsequences, which is right for a search box and wrong for identity, and it
 * merged Tabasco's "Habanero" with 88 unrelated products — pickles, chutney,
 * fresh peppers — because a short name is a subsequence of every longer one.
 */
import {
	canonicalMakerName,
	normalizeName,
	sauceDedupKey,
	slugifyName,
	stripMakerFromName
} from './utils/index.js';

/**
 * Shorter brand keys misfire as substrings of a product name — "heat" matches
 * "Heat Enhancer Hot Sauce", "hco" matches every "… Hot Sauce Co".
 */
const MIN_BRAND_KEY_LENGTH = 5;

/**
 * How many other makers may already use a word in their product names before it
 * is treated as vocabulary rather than a brand. "Chilli Inc" canonicalises to
 * "chilli", which occurs in 35 other makers' titles; left in, it claimed 81
 * listings that belong to other brands.
 */
const MAX_FOREIGN_TITLES = 2;

/**
 * The brands usable for recovering a missing maker from a product title.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 * @param {Map<string, string>} registry
 * @returns {[string, string][]} longest brand first
 */
function recoveryVocabulary(rows, registry) {
	const branded = rows
		.filter((row) => row.sauce.maker)
		.map((row) => ({
			owner: canonicalMakerName(row.sauce.maker),
			title: ` ${normalizeName(row.sauce.name)} `
		}));

	return [...registry.entries()]
		.filter(([key]) => key.length >= MIN_BRAND_KEY_LENGTH)
		.filter(([key]) => {
			const needle = ` ${key} `;
			/** @type {Set<string>} */
			const others = new Set();
			for (const row of branded) {
				if (row.owner === key || !row.title.includes(needle)) continue;
				others.add(row.owner);
				if (others.size > MAX_FOREIGN_TITLES) return false;
			}
			return true;
		})
		.sort((a, b) => b[0].length - a[0].length);
}

/**
 * The value most rows carry, with a length tiebreak. The two callers want
 * opposite tiebreaks, so it is a parameter rather than two near-identical sorts:
 * a maker keeps its fullest spelling ("Angry Goat Pepper Co." over "… Co"),
 * while a sauce keeps its shortest, because the longer ones still carry a suffix.
 *
 * @param {string[]} values
 * @param {'longest' | 'shortest'} tiebreak
 */
function mostCommon(values, tiebreak) {
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

	const longerFirst = tiebreak === 'longest';
	return [...counts.entries()].sort(
		(a, b) => b[1] - a[1] || (longerFirst ? b[0].length - a[0].length : a[0].length - b[0].length)
	)[0][0];
}

/**
 * Phase 2. Every brand any shop published this run, folded onto one canonical
 * key. Built from the whole run rather than per store: Hot Sauce Emporium names
 * no brands at all, and the brands that identify its products come from the
 * fifteen other shops that stock them.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 * @returns {Map<string, string>} canonical key -> the spelling to display
 */
export function buildMakerRegistry(rows) {
	/** @type {Map<string, string[]>} */
	const spellings = new Map();

	for (const row of rows) {
		const key = canonicalMakerName(row.sauce.maker);
		if (!key) continue;
		if (!spellings.has(key)) spellings.set(key, []);
		spellings.get(key).push(String(row.sauce.maker).trim());
	}

	/** @type {Map<string, string>} */
	const registry = new Map();
	for (const [key, names] of spellings) registry.set(key, mostCommon(names, 'longest'));

	return registry;
}

/**
 * Phase 3. Settles on one spelling of the brand for every listing, and fills the
 * brand for shops whose feed names none by finding one another shop published
 * inside the product title. Whole-word only, longest brand first, so "Angry Goat
 * Pepper" wins over a brand that prefixes it.
 *
 * Both halves matter for identity. A shop that writes "Melinda's Foods, LLC"
 * cannot strip that from "Melinda's Sriracha Ranch", so the brand stays in the
 * name and the listing keys differently from the same sauce elsewhere. Rewriting
 * the maker to the registry's spelling first makes the strip land, and leaves
 * every listing of one brand carrying the same string.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 * @param {Map<string, string>} registry
 * @returns {number} how many rows gained a maker they did not have
 */
export function applyRegistry(rows, registry) {
	const vocabulary = recoveryVocabulary(rows, registry);

	let recovered = 0;

	for (const row of rows) {
		let display = registry.get(canonicalMakerName(row.sauce.maker));

		if (!display) {
			const haystack = ` ${normalizeName(row.sauce.name)} `;
			const found = vocabulary.find(([key]) => haystack.includes(` ${key} `));
			if (!found) continue;
			[, display] = found;
			recovered++;
		}

		const name = stripMakerFromName(row.sauce.name, display);

		row.sauce.maker = display;
		row.sauce.name = name;
		row.sauce.slug = slugifyName(name);
	}

	return recovered;
}

/**
 * Turns the curated alias list into the key rewrites phase 4 applies.
 *
 * @param {import('./index.d').SauceAlias[]} aliases
 * @returns {Map<string, string>} alias key -> the key it is really the same as
 */
export function buildAliasMap(aliases) {
	/** @type {Map<string, string>} */
	const map = new Map();
	for (const { maker, names } of aliases) {
		const [canonical, ...rest] = names;
		const target = sauceDedupKey(canonical, maker);
		for (const name of rest) map.set(sauceDedupKey(name, maker), target);
	}
	return map;
}

/**
 * Phase 4. Groups every listing in the run by the key it must share to be the
 * same sauce.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 * @param {Map<string, string>} [aliases] from `buildAliasMap`
 * @returns {Map<string, import('./index.d').SauceGroup>}
 */
export function groupByIdentity(rows, aliases = new Map()) {
	/** @type {Map<string, import('./index.d').SauceGroup>} */
	const groups = new Map();

	for (const row of rows) {
		// `sauceDedupKey` owns the key grammar — never rebuild it here, or the
		// stored-sauce lookup in index.js silently stops matching this one.
		const scraped = sauceDedupKey(row.sauce.name, row.sauce.maker, row.storeKey);
		// A curated alias folds one of the maker's names onto the other.
		const key = aliases.get(scraped) ?? scraped;
		if (!groups.has(key)) {
			groups.set(key, { makerKey: canonicalMakerName(row.sauce.maker), rows: [] });
		}
		groups.get(key).rows.push(row);
	}

	return groups;
}

/**
 * The name to store for a sauce nobody has listed yet: the spelling most shops
 * use, shortest as a tiebreak, because the longer spellings are the ones still
 * carrying a suffix.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 */
export function displayName(rows) {
	return mostCommon(
		rows.map((row) => row.sauce.name),
		'shortest'
	);
}

/**
 * The description to store, and whether it came from a shop publishing English.
 * A shop writing in its own language may fill an empty description but must not
 * replace an English one — Maison Piquante and Sweet Pepper were overwriting
 * English copy with French on sauces five other shops also stock.
 *
 * @param {import('./index.d').ScrapedRow[]} rows
 */
export function bestDescription(rows) {
	const english = rows.find((row) => row.english && row.sauce.description);
	if (english) return { text: english.sauce.description, english: true };

	const any = rows.find((row) => row.sauce.description);
	return { text: any?.sauce.description ?? '', english: false };
}

/**
 * Slugs are public URLs, so they stay globally unique even though two makers may
 * now share a sauce name. The brand disambiguates the second one.
 *
 * @param {string} name
 * @param {string | null} maker
 * @param {Set<string>} taken
 */
export function uniqueSlug(name, maker, taken) {
	const base = slugifyName(name);

	/** @param {string} candidate */
	const claim = (candidate) => {
		if (taken.has(candidate)) return null;
		taken.add(candidate);
		return candidate;
	};

	// Plain name, then qualified by the brand, then numbered.
	const claimed = claim(base) ?? (maker ? claim(`${base}-${slugifyName(maker)}`) : null);
	if (claimed) return claimed;

	for (let suffix = 2; ; suffix++) {
		const numbered = claim(`${base}-${suffix}`);
		if (numbered) return numbered;
	}
}
