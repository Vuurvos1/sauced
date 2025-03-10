import { describe, it, expect } from 'vitest';

import { slugifyName, normalizeName, isSimilarName } from './format';

describe('slugifyName', () => {
	it('should slugify a name', () => {
		expect(slugifyName('Hello World')).toBe('hello-world');
	});

	it('should remove non-alphanumeric characters', () => {
		expect(slugifyName('Hello World!')).toBe('hello-world');

		expect(slugifyName('Hello+ World!&%#$*@#)($')).toBe('hello-world');
		expect(slugifyName('Hello+World')).toBe('helloworld');
	});
});

describe('normalizeName', () => {
	it('should normalize a name', () => {
		expect(normalizeName('Hello World')).toBe('hello world');

		expect(normalizeName('Hello-World')).toBe('hello world');
		expect(normalizeName('Hello World!')).toBe('hello world');
	});
});

describe('isSimilarName', () => {
	it('should return true if the names are similar', () => {
		expect(isSimilarName('Hello World', 'Hello World!')).toBe(true);
		expect(isSimilarName('foo', 'fo foo')).toBe(true);

		expect(isSimilarName('The Last Dab: Apollo', 'Hot Ones The Last Dab Apollo Hot Sauce')).toBe(
			true
		);
		expect(isSimilarName('The Last Dab XXX Hot Sauce', 'Hot Ones The Last Dab XXX Hot Sauce')).toBe(
			true
		);
	});

	it('should return false if the names are not similar', () => {
		expect(isSimilarName('foo', 'bar')).toBe(false);
		expect(isSimilarName('hello', 'world')).toBe(false);
		expect(isSimilarName('foo bar', 'hello world')).toBe(false);
		expect(
			isSimilarName('El Jefe Primo Salsa Barbacoa Cherry Hot Sauce', 'Fiya! Fiya! Hot Sauce')
		).toBe(false);
	});
});
