import { describe, it, expect } from 'vitest';

import {
	bestDescription,
	buildAliasMap,
	buildMakerRegistry,
	displayName,
	groupByIdentity,
	applyRegistry,
	uniqueSlug
} from './dedup';

/**
 * @param {string} storeKey
 * @param {string} name
 * @param {string | null} [maker]
 * @param {{ description?: string, english?: boolean, imageUrl?: string }} [extra]
 */
function row(storeKey, name, maker = null, extra = {}) {
	const { english = true, ...sauce } = extra;
	return { storeKey, english, sauce: { name, maker, url: `${storeKey}/${name}`, ...sauce } };
}

describe('buildMakerRegistry', () => {
	it('folds every spelling onto one maker', () => {
		const registry = buildMakerRegistry([
			row('a', 'Zombie Apocalypse', 'Torchbearer Sauces'),
			row('b', 'Zombie Apocalypse', 'TorchBearer'),
			row('c', 'Son of Zombie', 'Torchbearer Sauces')
		]);

		expect(registry.size).toBe(1);
		// Two shops spell it "Torchbearer Sauces", so that is the one to display.
		expect(registry.get('torchbearer')).toBe('Torchbearer Sauces');
	});

	it('ignores listings with no maker', () => {
		expect(buildMakerRegistry([row('a', 'Habanero')]).size).toBe(0);
	});
});

describe('applyRegistry', () => {
	it('takes the brand out of a title when another shop named it', () => {
		const rows = [
			row('heatonist', 'Cocoa Ghost', 'Queen Majesty'),
			row('hotsauceemporium', 'Queen Majesty Cocoa Ghost')
		];
		const recovered = applyRegistry(rows, buildMakerRegistry(rows));

		expect(recovered).toBe(1);
		expect(rows[1].sauce.maker).toBe('Queen Majesty');
		expect(rows[1].sauce.name).toBe('Cocoa Ghost');
		expect(rows[1].sauce.slug).toBe('cocoa-ghost');
	});

	// "heat" used to match "Heat Enhancer Hot Sauce", "hco" every "… Hot Sauce Co".
	it('leaves short brand keys alone', () => {
		const rows = [row('a', 'Reaper', 'Heat'), row('b', 'Heat Enhancer')];
		applyRegistry(rows, buildMakerRegistry(rows));

		expect(rows[1].sauce.maker).toBe(null);
	});

	it('does not match a brand inside a longer word', () => {
		const rows = [row('a', 'Original', 'Karma'), row('b', 'Karmageddon Sauce')];
		applyRegistry(rows, buildMakerRegistry(rows));

		expect(rows[1].sauce.maker).toBe(null);
	});
});

describe('groupByIdentity', () => {
	it('merges one sauce across shops that spell it differently', () => {
		const groups = groupByIdentity([
			row('a', 'Beyond Insanity Hot Sauce', 'Da Bomb'),
			row('b', 'Beyond Insanity', "Da' Bomb"),
			row('c', 'Beyond Insanity', 'DA BOMB')
		]);

		expect(groups.size).toBe(1);
		expect([...groups.values()][0].rows).toHaveLength(3);
	});

	it('keeps one name apart under two makers', () => {
		const groups = groupByIdentity([
			row('a', 'Garlic Habanero', 'The Pepper Ninja'),
			row('a', 'Garlic Habanero', 'Torchbearer')
		]);

		expect(groups.size).toBe(2);
	});

	// Without a brand there is no evidence two listings are the same sauce. Fuzzy
	// matching them merged Tabasco's "Habanero" with 88 unrelated products.
	it('scopes a listing with no maker to its own store', () => {
		const groups = groupByIdentity([
			row('chilisausbe', 'Habanero'),
			row('dekkerpepper', 'Habanero'),
			row('dekkerpepper', 'Habanero Pickles')
		]);

		expect(groups.size).toBe(3);
	});
});

describe('displayName', () => {
	it('prefers the spelling most shops use', () => {
		expect(
			displayName([row('a', 'Cocoa Ghost'), row('b', 'Cocoa Ghost'), row('c', 'Cocoa Ghost Sauce')])
		).toBe('Cocoa Ghost');
	});

	it('falls back to the shortest, which carries the least suffix', () => {
		expect(displayName([row('a', 'Beyond Insanity Hot Sauce'), row('b', 'Beyond Insanity')])).toBe(
			'Beyond Insanity'
		);
	});
});

describe('bestDescription', () => {
	it('prefers a shop publishing English', () => {
		const result = bestDescription([
			row('fr', 'Sauce', 'X', { description: 'Sauce piquante', english: false }),
			row('uk', 'Sauce', 'X', { description: 'A hot sauce', english: true })
		]);

		expect(result).toEqual({ text: 'A hot sauce', english: true });
	});

	it('reports a non-English description as such, so it cannot overwrite one', () => {
		const result = bestDescription([
			row('fr', 'Sauce', 'X', { description: 'Sauce piquante', english: false })
		]);

		expect(result).toEqual({ text: 'Sauce piquante', english: false });
	});
});

describe('uniqueSlug', () => {
	it('disambiguates a taken slug with the brand', () => {
		const taken = new Set();

		expect(uniqueSlug('Garlic Habanero', 'The Pepper Ninja', taken)).toBe('garlic-habanero');
		expect(uniqueSlug('Garlic Habanero', 'Torchbearer', taken)).toBe('garlic-habanero-torchbearer');
	});

	it('counts up when the brand is not enough', () => {
		const taken = new Set(['habanero', 'habanero-tabasco']);

		expect(uniqueSlug('Habanero', 'Tabasco', taken)).toBe('habanero-2');
	});
});

describe('applyRegistry — one spelling per brand', () => {
	// "Melinda's Foods, LLC" cannot be stripped from "Melinda's Sriracha Ranch",
	// so the brand stayed in the name and the sauce re-inserted on every run.
	it('rewrites the maker to the registry spelling and strips it', () => {
		const rows = [
			row('a', 'Sriracha Ranch', "Melinda's"),
			row('b', 'Sriracha Ranch', "Melinda's"),
			row('c', "Melinda's Sriracha Ranch", 'Melinda’s Foods, LLC')
		];
		applyRegistry(rows, buildMakerRegistry(rows));

		expect(rows[2].sauce.maker).toBe("Melinda's");
		expect(rows[2].sauce.name).toBe('Sriracha Ranch');
		expect(groupByIdentity(rows).size).toBe(1);
	});
});

describe('recovery vocabulary', () => {
	// "Chilli Inc" canonicalises to "chilli", a word in 35 other makers' titles.
	// Left in the vocabulary it claimed 81 listings belonging to other brands.
	it('will not recover from a brand that is an ordinary product word', () => {
		const rows = [
			row('a', 'Reaper', 'Chilli Inc'),
			row('b', 'Crispy Chilli Oil', 'Mama Yu'),
			row('c', 'Chilli Jam', 'Tracklements'),
			row('d', 'Sweet Chilli Relish', 'Stokes'),
			row('e', 'Chilli Chan Noodles')
		];
		applyRegistry(rows, buildMakerRegistry(rows));

		expect(rows[4].sauce.maker).toBe(null);
	});

	it('still recovers from a brand that is only its own', () => {
		const rows = [row('a', 'Cocoa Ghost', 'Queen Majesty'), row('b', 'Queen Majesty Sriracha')];
		applyRegistry(rows, buildMakerRegistry(rows));

		expect(rows[1].sauce.maker).toBe('Queen Majesty');
	});
});

describe('buildAliasMap', () => {
	// Heatsupply lists Raijmakers by flavour, Some Like It Hot by product name.
	// The names share no words, so only a curated entry can join them.
	it('folds a maker’s second name for a sauce onto the first', () => {
		const aliases = buildAliasMap([
			{
				maker: 'Raijmakers Heetmakers',
				names: ['Brain Buzzer Hot Sauce', 'Carolina Reaper & Ginger']
			}
		]);
		const groups = groupByIdentity(
			[
				row('somelikeithot', 'Brain Buzzer Hot Sauce', 'Raijmakers Heetmakers'),
				row('heatsupply', 'Carolina Reaper & Ginger', 'Raijmakers Heetmakers')
			],
			aliases
		);

		expect(groups.size).toBe(1);
		expect([...groups.values()][0].rows).toHaveLength(2);
	});

	it('leaves another maker’s identical name alone', () => {
		const aliases = buildAliasMap([
			{
				maker: 'Raijmakers Heetmakers',
				names: ['Brain Buzzer Hot Sauce', 'Carolina Reaper & Ginger']
			}
		]);
		const groups = groupByIdentity(
			[
				row('a', 'Carolina Reaper & Ginger', 'Raijmakers Heetmakers'),
				row('b', 'Carolina Reaper & Ginger', 'Some Other Maker')
			],
			aliases
		);

		expect(groups.size).toBe(2);
	});
});
