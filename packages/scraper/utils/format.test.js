import { describe, it, expect } from 'vitest';

import {
	slugifyName,
	normalizeName,
	isSimilarName,
	foldAccents,
	cleanProductName,
	stripMakerFromName
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

describe('isSimilarName', () => {
	it('should return true if the names are similar', () => {
		expect(isSimilarName('Hello World', 'Hello World!')).toBe(true);
		expect(isSimilarName('foo', 'fo foo')).toBe(true);

		expect(isSimilarName('The Last Dab: Apollo', 'Hot Ones The Last Dab Apollo Hot Sauce')).toBe(
			true
		);
		expect(isSimilarName('Hot Ones The Last Dab Apollo Hot Sauce', 'The Last Dab: Apollo')).toBe(
			true
		);

		expect(isSimilarName('The Last Dab XXX Hot Sauce', 'Hot Ones The Last Dab XXX Hot Sauce')).toBe(
			true
		);
		expect(isSimilarName('Hot Ones The Last Dab XXX Hot Sauce', 'The Last Dab XXX Hot Sauce')).toBe(
			true
		);
	});

	it('should treat accented and unaccented spellings as the same sauce', () => {
		expect(isSimilarName('Habañero Loco', 'Habanero Loco')).toBe(true);
		expect(isSimilarName('Piri-Piri Clássico', 'Piri Piri Classico')).toBe(true);
	});

	it('should return false if the names are not similar', () => {
		expect(isSimilarName('foo', 'bar')).toBe(false);
		expect(isSimilarName('hello', 'world')).toBe(false);
		expect(isSimilarName('hello', '')).toBe(false);
		expect(
			isSimilarName('El Jefe Primo Salsa Barbacoa Cherry Hot Sauce', 'Fiya! Fiya! Hot Sauce')
		).toBe(false);
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
