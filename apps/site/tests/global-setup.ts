import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { user, session, account, verification, schema } from '@app/db';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CANONICAL_USER = {
	email: 'verified@test.local',
	password: 'TestPassword123',
	name: 'Test User',
	username: 'testuser'
} as const;

export default async function globalSetup() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		throw new Error(
			'DATABASE_URL not set. Is apps/site/.env.test present and is the db-test container running? Try: docker compose up -d db-test'
		);
	}

	const client = postgres(dbUrl, { max: 1 });
	const db = drizzle(client, { schema });

	try {
		await migrate(db, {
			migrationsFolder: resolve(__dirname, '../../../packages/db/drizzle')
		});

		// Truncate in FK-safe order: children first, then user.
		await db.delete(session);
		await db.delete(account);
		await db.delete(verification);
		await db.delete(user);

		// Standalone better-auth instance for seeding. Mirrors prod config
		// minus SvelteKit plugins that won't resolve outside Vite.
		const setupAuth = betterAuth({
			database: drizzleAdapter(db, { provider: 'pg' }),
			emailAndPassword: {
				enabled: true,
				requireEmailVerification: true
			},
			user: {
				additionalFields: {
					username: {
						type: 'string',
						required: true,
						unique: true,
						input: true
					}
				}
			}
		});

		await setupAuth.api.signUpEmail({
			body: {
				email: CANONICAL_USER.email,
				password: CANONICAL_USER.password,
				name: CANONICAL_USER.name,
				username: CANONICAL_USER.username
			}
		});

		await db
			.update(user)
			.set({ emailVerified: true })
			.where(eq(user.email, CANONICAL_USER.email));
	} finally {
		await client.end();
	}
}
