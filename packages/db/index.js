import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';


import * as authSchema from './schema/auth.js';
import * as sauceSchema from './schema/sauce.js';

export * from './schema/auth.js';
export * from './schema/sauce.js';

export const schema = {
  ...authSchema,
  ...sauceSchema,
};

/**
 * @param {string | undefined} dbUrl
 * @returns
 */
export function getDb(dbUrl) {
  if (!dbUrl) {
    throw new Error('Database URL is required');
  }

  const client = postgres(dbUrl);
  return drizzle(client, { schema });
}
