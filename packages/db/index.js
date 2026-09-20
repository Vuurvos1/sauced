import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as authSchema from './schema/auth.js';
import * as sauceSchema from './schema/sauce.js';

export * from './schema/auth.js';
export * from './schema/sauce.js';

export const schema = {
	...authSchema,
	...sauceSchema
};

/** Loose enough for one wrong letter, strict enough to keep unrelated names out. */
export const WORD_SIMILARITY_THRESHOLD = 0.45;

/**
 * @param {string | undefined} dbUrl
 * @returns
 */
export function getDb(dbUrl) {
	if (!dbUrl) {
		throw new Error('Database URL is required');
	}

	const client = postgres(dbUrl, {
		// Postgres' default word similarity threshold (0.6) rejects single-letter
		// misspellings like "habenero", which is exactly what fuzzy search is for.
		// Set at connect time so every `<%` in a search query uses it.
		connection: { options: `-c pg_trgm.word_similarity_threshold=${WORD_SIMILARITY_THRESHOLD}` }
	});
	return drizzle(client, { schema });
}
