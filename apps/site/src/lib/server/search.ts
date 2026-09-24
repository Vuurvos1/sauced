import { or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { hotSauces, makers } from '@app/db/schema';
import { WORD_SIMILARITY_THRESHOLD } from '@app/db';
import { db } from './db';

/** Either the pool itself or a transaction on it, so callers can share query code. */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Shorter queries produce too many trigram matches to be useful. */
export const MIN_SEARCH_LENGTH = 2;

/** Anything longer is a paste, not a search, and only makes Postgres work harder. */
const MAX_SEARCH_LENGTH = 100;

/** Backslash is LIKE's default escape character, so no ESCAPE clause is needed. */
function escapeLike(query: string) {
	return query.replace(/[\\%_]/g, '\\$&');
}

export function normalizeQuery(raw: string | null | undefined) {
	return (raw ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Accent-folded form of a column, matching the expression the trigram indexes
 * are keyed on. Every comparison below goes through it, both so "habanero"
 * finds "Habañero" and so the planner can still use those indexes.
 */
function folded(column: PgColumn): SQL {
	return sql`immutable_unaccent(${column})`;
}

/** Same folding for the user's query, which arrives however they typed it. */
function foldedQuery(query: string): SQL<string> {
	return sql<string>`immutable_unaccent(${query})`;
}

/**
 * Matches `column` against the query: substring first, then trigram word
 * similarity so typos ("sriracha" vs "srirahca") still hit. Both arms are served
 * by the `gin_trgm_ops` indexes from migration 0005.
 */
export function matchesQuery(column: PgColumn, query: string): SQL {
	return sql`(${folded(column)} ilike ${foldedQuery(`%${escapeLike(query)}%`)} or ${foldedQuery(query)} <% ${folded(column)})`;
}

/**
 * Coarse match tier used as the primary sort key: exact name beats prefix beats
 * substring beats a fuzzy-only hit, so popularity can never bury a literal match.
 */
export function matchTier(column: PgColumn, query: string): SQL<number> {
	return sql<number>`case
		when lower(${folded(column)}) = lower(${foldedQuery(query)}) then 3
		when ${folded(column)} ilike ${foldedQuery(`${escapeLike(query)}%`)} then 2
		when ${folded(column)} ilike ${foldedQuery(`%${escapeLike(query)}%`)} then 1
		else 0
	end`;
}

/** Tiebreaker within a tier: how much of the query the column actually covers. */
export function matchSimilarity(column: PgColumn, query: string): SQL<number> {
	return sql<number>`word_similarity(${foldedQuery(query)}, ${folded(column)})`;
}

/**
 * Runs `fn` with the trigram threshold lowered for the duration of one
 * transaction, so `<%` accepts a one-letter typo.
 *
 * Transaction-local rather than a connection setting: poolers reject the
 * `-c pg_trgm...` startup parameter, and a session-level SET would leak into
 * whichever request reuses that backend next. Keeping the operator (instead of
 * an inlined `word_similarity(...) >= x`) is what keeps the match served by the
 * gin_trgm_ops index rather than a sequential scan.
 */
export function withFuzzyMatching<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY_THRESHOLD)}, true)`
		);
		return fn(tx);
	});
}

/**
 * The maker used to be part of the sauce name, so searching "queen majesty" hit
 * `hotSauces.name`. The scraper strips it now, so match the joined brand too.
 * A correlated EXISTS keeps this a drop-in `where` fragment — no call site has
 * to add a join — and the subquery still uses `makers_name_trgm_idx`.
 */
function makerMatchesQuery(query: string): SQL {
	return sql`exists (
		select 1 from ${makers}
		where ${makers.makerId} = ${hotSauces.makerId}
		  and ${matchesQuery(makers.name, query)}
	)`;
}

/** A sauce matches on its name, its description, or the brand that makes it. */
export function sauceMatchesQuery(query: string) {
	return or(
		matchesQuery(hotSauces.name, query),
		matchesQuery(hotSauces.description, query),
		makerMatchesQuery(query)
	);
}
