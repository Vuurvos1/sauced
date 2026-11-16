import { beforeAll, describe, expect, it, vi } from 'vitest';
import { asc, desc } from 'drizzle-orm';
import { hotSauces, makers } from '@app/db/schema';
import { db as testDb } from './db';
import {
	matchesQuery,
	matchSimilarity,
	matchTier,
	normalizeQuery,
	sauceMatchesQuery,
	withFuzzyMatching
} from './search';

// One migrated in-memory database per test file; `search.ts` and the seeding
// below both get it through the mocked module.
vi.mock('./db', async () => ({ db: await (await import('@app/db/testing')).createTestDb() }));

beforeAll(async () => {
	const [queenMajesty] = await testDb
		.insert(makers)
		.values([
			{ name: 'Queen Majesty', slug: 'queen-majesty' },
			{ name: 'Habañero Hell', slug: 'habanero-hell' }
		])
		.returning();

	await testDb.insert(hotSauces).values([
		{ name: 'Sriracha', slug: 'sriracha' },
		{ name: 'Sriracha Gold', slug: 'sriracha-gold' },
		{ name: 'Red Sriracha', slug: 'red-sriracha' },
		{ name: 'Scotch Bonnet & Ginger', slug: 'scotch-bonnet-ginger', makerId: queenMajesty.makerId },
		{ name: '100% Pepper', slug: '100-pepper', description: 'Nothing but chilli' }
	]);
});

/** Names of sauces matching `query`, inside the same fuzzy transaction the routes use. */
function searchSauces(query: string) {
	return withFuzzyMatching(async (tx) =>
		(
			await tx
				.select({ name: hotSauces.name })
				.from(hotSauces)
				.where(sauceMatchesQuery(query))
				.orderBy(
					desc(matchTier(hotSauces.name, query)),
					desc(matchSimilarity(hotSauces.name, query)),
					asc(hotSauces.name)
				)
		).map((row) => row.name)
	);
}

describe('normalizeQuery', () => {
	it('trims and treats a missing query as empty', () => {
		expect(normalizeQuery('  sriracha ')).toBe('sriracha');
		expect(normalizeQuery(null)).toBe('');
		expect(normalizeQuery(undefined)).toBe('');
	});

	it('caps pasted text at 100 characters', () => {
		expect(normalizeQuery('a'.repeat(500))).toHaveLength(100);
	});
});

describe('matchesQuery', () => {
	it('folds accents on both sides', async () => {
		const names = (query: string) =>
			testDb
				.select({ name: makers.name })
				.from(makers)
				.where(matchesQuery(makers.name, query))
				.then((rows) => rows.map((row) => row.name));

		expect(await names('habanero')).toEqual(['Habañero Hell']);
		expect(await names('HABAÑERO')).toEqual(['Habañero Hell']);
	});

	it('treats LIKE wildcards in the query literally', async () => {
		expect(await searchSauces('100%')).toEqual(['100% Pepper']);
		expect(await searchSauces('%')).toEqual(['100% Pepper']);
	});
});

describe('withFuzzyMatching', () => {
	it('lets a one-letter typo through', async () => {
		expect(await searchSauces('srirahca')).toContain('Sriracha');
	});

	it('only lowers the trigram threshold for its own transaction', async () => {
		await searchSauces('srirahca');

		const outside = await testDb
			.select({ name: hotSauces.name })
			.from(hotSauces)
			.where(sauceMatchesQuery('srirahca'));
		expect(outside).toEqual([]);
	});
});

describe('sauce search ranking', () => {
	it('ranks exact, then prefix, then substring matches', async () => {
		expect(await searchSauces('sriracha')).toEqual(['Sriracha', 'Sriracha Gold', 'Red Sriracha']);
	});

	it('finds a sauce by its maker', async () => {
		expect(await searchSauces('queen majesty')).toEqual(['Scotch Bonnet & Ginger']);
	});
});
