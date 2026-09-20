import { describe, it, expect } from 'vitest';

import { slugifyName, normalizeName, isSimilarName, foldAccents } from './format';

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
