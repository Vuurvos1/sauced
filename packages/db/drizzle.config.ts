import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema',
  out: './drizzle',
  dbCredentials: {
    // @ts-expect-error - process.env is available at runtime
    url: process.env.DATABASE_URL,
  },
});
