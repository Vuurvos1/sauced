import { describe, it, expect } from 'vitest';
import { isBundleName, shouldSkipProduct } from './filter.js';

describe('isBundleName', () => {
	it('keeps ordinary sauces', () => {
		for (const name of [
			'Habanero Hustle',
			'Reaper Rollin',
			'Garlic Habanero',
			'Madame Jeanette & Adjuma Pepper Sauce',
			'Sweet Sting Hot Honey'
		]) {
			expect(isBundleName(name), name).toBe(false);
		}
	});

	it('drops multipacks', () => {
		for (const name of ['3 Pack', '3-Pack Hot Sauce', 'Hot Sauce 5 pack', 'Trio Box', 'Duo']) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops gift sets in the spellings stores actually use', () => {
		for (const name of [
			'Raijmakers Heetmakers Hot Sauce Giftpack',
			'Gift Set',
			'Scovello Gift cards',
			'Hot Sauce Gift Box'
		]) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops subscriptions and challenges', () => {
		for (const name of [
			'Monthly Subscription',
			'The Wings of Death Challenge',
			'Year of Hot Ones'
		]) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops merch', () => {
		for (const name of ["Chardy's hat", "Chardy's Tote Bag", 'Hot Ones Socks', 'Logo T-Shirt']) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('treats a missing name as unusable', () => {
		expect(isBundleName('')).toBe(true);
		expect(isBundleName(null)).toBe(true);
	});
});

describe('shouldSkipProduct', () => {
	it('applies store-specific patterns on top of the bundle filter', () => {
		expect(shouldSkipProduct('Original Hot -C', [/\s-C$/])).toBe(true);
		expect(shouldSkipProduct('Original Hot', [/\s-C$/])).toBe(false);
	});
});
