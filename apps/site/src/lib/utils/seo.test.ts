import { describe, it, expect } from 'vitest';
import { formatTitle, metaDescription } from './seo';

describe('formatTitle', () => {
	it('suffixes the site name', () => {
		expect(formatTitle('All hot sauces')).toBe('All hot sauces · Sauced');
	});

	it('can lead with the site name', () => {
		expect(formatTitle('Find and rate hot sauces', true)).toBe('Sauced · Find and rate hot sauces');
	});

	it('falls back to the site name alone', () => {
		expect(formatTitle()).toBe('Sauced');
		expect(formatTitle('')).toBe('Sauced');
	});
});

describe('metaDescription', () => {
	it('collapses whitespace', () => {
		expect(metaDescription('  a\n\tsauce  ')).toBe('a sauce');
	});

	it('returns null when there is nothing to describe', () => {
		expect(metaDescription('')).toBeNull();
		expect(metaDescription('   ')).toBeNull();
		expect(metaDescription(null)).toBeNull();
	});

	it('trims on a word boundary and drops trailing punctuation', () => {
		expect(metaDescription('one two three, four', 15)).toBe('one two three…');
	});

	it('hard-cuts a word longer than half the budget', () => {
		expect(metaDescription('a'.repeat(30), 10)).toBe(`${'a'.repeat(9)}…`);
	});

	it('leaves anything within budget alone', () => {
		expect(metaDescription('short enough', 160)).toBe('short enough');
	});
});
