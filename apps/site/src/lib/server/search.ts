import { or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { hotSauces } from '@app/db/schema';

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
 * Matches `column` against the query: substring first, then trigram word
 * similarity so typos ("sriracha" vs "srirahca") still hit. Both arms are served
 * by the `gin_trgm_ops` indexes from migration 0004.
 */
export function matchesQuery(column: PgColumn, query: string): SQL {
	return sql`(${column} ilike ${`%${escapeLike(query)}%`} or ${query} <% ${column})`;
}

/**
 * Coarse match tier used as the primary sort key: exact name beats prefix beats
 * substring beats a fuzzy-only hit, so popularity can never bury a literal match.
 */
export function matchTier(column: PgColumn, query: string): SQL<number> {
	return sql<number>`case
		when lower(${column}) = lower(${query}) then 3
		when ${column} ilike ${`${escapeLike(query)}%`} then 2
		when ${column} ilike ${`%${escapeLike(query)}%`} then 1
		else 0
	end`;
}

/** Tiebreaker within a tier: how much of the query the column actually covers. */
export function matchSimilarity(column: PgColumn, query: string): SQL<number> {
	return sql<number>`word_similarity(${query}, ${column})`;
}

/** A sauce matches on its name or, more loosely, on its description. */
export function sauceMatchesQuery(query: string) {
	return or(matchesQuery(hotSauces.name, query), matchesQuery(hotSauces.description, query));
}
