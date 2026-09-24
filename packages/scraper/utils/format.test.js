import { describe, it, expect } from 'vitest';

import {
	slugifyName,
	normalizeName,
	foldAccents,
	cleanProductName,
	stripMakerFromName,
	canonicalMakerName,
	canonicalSauceName,
	sauceDedupKey
} from './format';

describe('slugifyName', () => {
	it('should slugify a name', () => {
		expect(slugifyName('Hello World')).toBe('hello-world');
	});

	it('should remove non-alphanumeric characters', () => {
		expect(slugifyName('Hello World!')).toBe('hello-world');

		expect(slugifyName('Hello+ World!&%#$*@#)($')).toBe('hello-world');
		expect(slugifyName('Hello+World')).toBe('helloworld');
	});

	// Stripping the accent as punctuation used to yield "habaero-loco".
	it('should keep the base letter of an accented character', () => {
		expect(slugifyName('Habañero Loco')).toBe('habanero-loco');
		expect(slugifyName('Piri-Piri Clássico')).toBe('piripiri-classico');
		expect(slugifyName('Sriracha Café')).toBe('sriracha-cafe');
	});
});

describe('foldAccents', () => {
	it('should map accented letters onto their base letter', () => {
		expect(foldAccents('Habañero')).toBe('Habanero');
		expect(foldAccents('Jalapeño Clássico')).toBe('Jalapeno Classico');
		expect(foldAccents('àéîõü ÀÉÎÕÜ')).toBe('aeiou AEIOU');
	});

	// These carry no combining mark, so NFD alone leaves them untouched.
	it('should map letters that NFD cannot decompose', () => {
		expect(foldAccents('smørrebrød')).toBe('smorrebrod');
		expect(foldAccents('Łódź')).toBe('Lodz');
		expect(foldAccents('straße')).toBe('strasse');
		expect(foldAccents('Æble')).toBe('AEble');
	});

	it('should leave unaccented text alone', () => {
		expect(foldAccents('Naga Viper')).toBe('Naga Viper');
		expect(foldAccents('')).toBe('');
	});
});

describe('normalizeName', () => {
	it('should normalize a name', () => {
		expect(normalizeName('Hello World')).toBe('hello world');

		expect(normalizeName('Hello-World')).toBe('hello world');
		expect(normalizeName('Hello World!')).toBe('hello world');
	});

	// Stripping the accent as punctuation used to split this into "haba ero".
	it('should not split a word at an accented character', () => {
		expect(normalizeName('Habañero Loco')).toBe('habanero loco');
		expect(normalizeName('Jalapeño')).toBe('jalapeno');
	});
});

describe('cleanProductName', () => {
	it('should strip serving sizes', () => {
		expect(cleanProductName('Melinda’s Chipotle Hot Sauce 148ml')).toBe(
			'Melinda’s Chipotle Hot Sauce'
		);
		expect(cleanProductName('Slap Ya Mama Original Blend, 8oz')).toBe(
			'Slap Ya Mama Original Blend'
		);
		expect(cleanProductName('Het Sass: Miso Hot Sauce | 148ml | Singularity Sauce Co.')).toBe(
			'Het Sass: Miso Hot Sauce | Singularity Sauce Co.'
		);
	});

	it('should strip promotional copy', () => {
		expect(
			cleanProductName("Blonde Beard's Dojo Asian Wing Sauce – *REDUCED*  **LAST CHANCE TO BUY**")
		).toBe("Blonde Beard's Dojo Asian Wing Sauce");
		expect(cleanProductName('*PSYCHO JUICE 70% Habanero')).toBe('PSYCHO JUICE 70% Habanero');
		expect(cleanProductName('Aji Mango Pot Plant (Pre Order)')).toBe('Aji Mango Pot Plant');
	});

	it('should strip a heat level, which is shop metadata', () => {
		expect(cleanProductName('Da Bomb – Beyond Insanity (Heat Level 12)')).toBe(
			'Da Bomb – Beyond Insanity'
		);
	});

	it('should leave a clean name untouched', () => {
		expect(cleanProductName('Naga Viper')).toBe('Naga Viper');
		expect(cleanProductName('Habanero Hustle')).toBe('Habanero Hustle');
	});

	// Stripping every token would otherwise leave an empty name.
	it('should fall back to the original when cleaning empties the name', () => {
		expect(cleanProductName('250ml')).toBe('250ml');
	});
});

describe('slugifyName — stranded separators', () => {
	it('should not leave a trailing hyphen where an emoji was', () => {
		expect(slugifyName('Melinda’s - Black Truffle Hot Sauce 🍯')).toBe(
			'melindas-black-truffle-hot-sauce'
		);
		expect(slugifyName('Hot Zeg - Krush 🍊')).toBe('hot-zeg-krush');
	});
});

describe('stripMakerFromName', () => {
	it('should remove the maker from either end', () => {
		expect(stripMakerFromName('Queen Majesty - Scotch Bonnet & Ginger', 'Queen Majesty')).toBe(
			'Scotch Bonnet & Ginger'
		);
		expect(stripMakerFromName('Cocoa Ghost Hot Sauce Queen Majesty', 'Queen Majesty')).toBe(
			'Cocoa Ghost Hot Sauce'
		);
		expect(stripMakerFromName('HotZeg Adixxion Hot Sauce', 'HotZeg')).toBe('Adixxion Hot Sauce');
	});

	// Shops register "Queen Majesty Hot Sauce" but title the product
	// "Queen Majesty Cocoa Ghost", which left it a separate sauce.
	it('should strip the brand without its trade suffix', () => {
		expect(stripMakerFromName('Queen Majesty Cocoa Ghost', 'Queen Majesty Hot Sauce')).toBe(
			'Cocoa Ghost'
		);
		expect(stripMakerFromName('Torchbearer Garlic Reaper', 'Torchbearer Sauces')).toBe(
			'Garlic Reaper'
		);
	});

	// Shops punctuate a brand however they like, and some bury it mid-title.
	// Four listings of Da Bomb's Beyond Insanity stayed four sauces over this.
	it('should match a brand however it is punctuated, anywhere in the title', () => {
		expect(stripMakerFromName('Sauce Da’Bomb Beyond Insanity', 'Da Bomb')).toBe(
			'Sauce Beyond Insanity'
		);
		expect(stripMakerFromName("Da' Bomb Beyond Insanity Hot Sauce", 'Da Bomb')).toBe(
			'Beyond Insanity Hot Sauce'
		);
	});

	it('should leave the name alone when the maker is not in it', () => {
		expect(stripMakerFromName('Habanero Hustle', 'T-Rex Hot Sauce')).toBe('Habanero Hustle');
	});

	// Otherwise the sauce would end up with no name at all.
	it('should keep a sauce named only after its maker', () => {
		expect(stripMakerFromName('Torchbearer', 'Torchbearer')).toBe('Torchbearer');
	});

	// "Valentina ❤️" minus "Valentina" is an emoji, which slugifies to nothing.
	it('should keep the name when stripping would leave no letters', () => {
		expect(stripMakerFromName('Valentina ❤️', 'Valentina')).toBe('Valentina ❤️');
		expect(stripMakerFromName('Truff - 🔥', 'Truff')).toBe('Truff - 🔥');
	});

	it('should tolerate a missing maker', () => {
		expect(stripMakerFromName('Naga Viper', '')).toBe('Naga Viper');
		expect(stripMakerFromName('Naga Viper', null)).toBe('Naga Viper');
	});
});

describe('canonicalMakerName', () => {
	it('folds the spellings shops vary', () => {
		expect(canonicalMakerName('Torchbearer Sauces')).toBe(canonicalMakerName('TorchBearer'));
		expect(canonicalMakerName('Queen Majesty Hot Sauce')).toBe(canonicalMakerName('Queen Majesty'));
		expect(canonicalMakerName("Da' Bomb")).toBe(canonicalMakerName('DA BOMB'));
	});

	// normalizeName leaves "'s" as a stranded " s", which kept these apart.
	it('folds a possessive', () => {
		expect(canonicalMakerName("Marie Sharp's")).toBe('marie sharp');
		expect(canonicalMakerName('Marie Sharp')).toBe('marie sharp');
		expect(canonicalMakerName("Dawson's Hot Sauce")).toBe(canonicalMakerName('Dawson’s'));
	});

	// The corporate suffix eats the "sauce" the type suffix needs, so one pass
	// left "heartbeat hot" and split the brand in two.
	it('strips a corporate and a type suffix together', () => {
		expect(canonicalMakerName('Heartbeat Hot Sauce Co.')).toBe('heartbeat');
		expect(canonicalMakerName('Heartbeat Hot Sauce')).toBe('heartbeat');
		expect(canonicalMakerName('Melinda’s Foods, LLC')).toBe('melinda');
	});

	it('never trims a brand away entirely', () => {
		expect(canonicalMakerName('K-Sauce')).toBe('k sauce');
		expect(canonicalMakerName('Sauce Shop')).toBe('sauce shop');
	});
});

describe('canonicalSauceName', () => {
	it('drops the brand and the product type', () => {
		expect(canonicalSauceName('Beyond Insanity Hot Sauce', 'Da Bomb')).toBe('beyond insanity');
		expect(canonicalSauceName('Da Bomb – Beyond Insanity', 'Da Bomb')).toBe('beyond insanity');
		expect(canonicalSauceName('Beyond Insanity', 'Da Bomb')).toBe('beyond insanity');
	});

	// A brand loses its possessive "s" so "Marie Sharp's" meets "Marie Sharp";
	// a sauce keeps it, because "Zuzu's" and "Zuzu" are not the same sauce.
	it('keeps the s of a possessive in the sauce name', () => {
		expect(canonicalSauceName("Zuzu's 7-Pot Sauce", "Dawson's")).toBe('zuzus 7 pot');
	});
});

describe('sauceDedupKey', () => {
	it('matches the same sauce across shops that spell it differently', () => {
		expect(sauceDedupKey('Queen Majesty Cocoa Ghost', 'Queen Majesty', 'a')).toBe(
			sauceDedupKey('Cocoa Ghost Hot Sauce', 'Queen Majesty Hot Sauce', 'b')
		);
	});

	// The whole point of keying on the maker: "Garlic Habanero" is two sauces.
	it('keeps one name apart under two makers', () => {
		expect(sauceDedupKey('Garlic Habanero', 'The Pepper Ninja', 'a')).not.toBe(
			sauceDedupKey('Garlic Habanero', 'Torchbearer', 'a')
		);
	});

	// Without a brand there is nothing to prove two listings are the same sauce,
	// so they stay separate rather than merging on a generic name.
	it('keeps maker-less listings scoped to their store', () => {
		expect(sauceDedupKey('Habanero', null, 'chilisausbe')).not.toBe(
			sauceDedupKey('Habanero', null, 'dekkerpepper')
		);
	});
});

describe('canonicalSauceName — normalisation order', () => {
	// The accents used to be folded after the brand was stripped, so an accented
	// spelling of the brand never matched and stayed in the name.
	it('folds accents before removing the maker', () => {
		expect(canonicalSauceName('Mélinda’s Sriracha Ranch', "Melinda's")).toBe('sriracha ranch');
		expect(canonicalSauceName('Habañero Loco', null)).toBe('habanero loco');
	});

	// A suffix-only trim missed every shop that leads with the type or buries it.
	it('removes the product type wherever it sits', () => {
		expect(canonicalSauceName('Hot Sauce Original', 'Cholula')).toBe('original');
		expect(canonicalSauceName('Sauce Red Habanero', 'Heartbeat')).toBe('red habanero');
		expect(canonicalSauceName("Steve-O's Hot Sauce Butthole Destroyer", null)).toBe(
			'steve os butthole destroyer'
		);
	});

	// Deleting the hyphen outright splits these two, which are one sauce.
	it('turns punctuation into a space, not nothing', () => {
		expect(canonicalSauceName('Fire-Roasted Pepper Blend', 'Fresco')).toBe(
			canonicalSauceName('Fire Roasted Pepper Blend Hot Sauce', 'Fresco')
		);
		expect(canonicalSauceName('Ashes-2-Ashes Hot Sauce', 'Karma')).toBe('ashes 2 ashes');
	});

	it('keeps a sauce named only after its type', () => {
		expect(canonicalSauceName('Hot Sauce', 'Tapatio')).toBe('hot sauce');
	});
});

describe('canonicalSauceName — apostrophes and spacing', () => {
	// As a space it left a stray "s" token, so "Zuzus" and "Zuzu's" never met.
	it('drops the apostrophe rather than spacing it', () => {
		expect(canonicalSauceName("Zuzu's 7-Pot Sauce", "Dawson's")).toBe('zuzus 7 pot');
		expect(canonicalSauceName('Zuzus 7 Pot Hot Sauce', "Dawson's")).toBe('zuzus 7 pot');
	});

	it('handles every quote mark a shop might type', () => {
		expect(canonicalSauceName('Zuzu’s 7-Pot', null)).toBe(canonicalSauceName("Zuzu's 7-Pot", null));
	});

	it('lower cases and collapses runs of space', () => {
		expect(canonicalSauceName('  REAPER   —   Blueberry  ', null)).toBe('reaper blueberry');
	});
});
