import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { user, schema } from '@app/db';
import { randomUUID } from 'node:crypto';

export interface TestUser {
	email: string;
	password: string;
	name: string;
	username: string;
}

export async function createTestUser(opts: { verified: boolean }): Promise<TestUser> {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) throw new Error('DATABASE_URL not set');

	const client = postgres(dbUrl, { max: 1 });
	const db = drizzle(client, { schema });

	try {
		const id = randomUUID();
		const testUser: TestUser = {
			email: `test-${id}@test.local`,
			password: 'TestPassword123',
			name: `Test User ${id.slice(0, 8)}`,
			username: `test-${id.slice(0, 8)}`
		};

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
				email: testUser.email,
				password: testUser.password,
				name: testUser.name,
				username: testUser.username
			}
		});

		if (opts.verified) {
			await db.update(user).set({ emailVerified: true }).where(eq(user.email, testUser.email));
		}

		return testUser;
	} finally {
		await client.end();
	}
}
