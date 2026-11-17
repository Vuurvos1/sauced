import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { schema } from './index.js';

const migrationsFolder = fileURLToPath(new URL('./drizzle', import.meta.url));

/**
 * In-memory Postgres for unit tests that need real SQL, migrated with the same
 * files production runs, so the extensions and the `immutable_unaccent`
 * indexes from 0005 are exercised too.
 *
 * PGlite is single-connection and currently Postgres 18 while production is 16:
 * fine for query logic, but Playwright keeps running against a real server.
 */
export async function createTestDb() {
	const client = new PGlite({ extensions: { pg_trgm, unaccent } });
	const db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder });
	return db;
}
