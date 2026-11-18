/**
 * Creates the local admin, or puts it back as documented: admin@sauced.local with
 * the password below, verified, role 'admin'. Run with `pnpm site seed:admin`.
 *
 * Local only: the login is in the README, so it refuses any database that isn't on
 * this machine. Production admins are made by promoting a real account.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { and, eq } from 'drizzle-orm';
import { account, getDb, schema, user } from '@app/db';
import { assertLocalDatabase } from '@app/db/local';

export const LOCAL_ADMIN = {
	email: 'admin@sauced.local',
	password: 'sauced-admin',
	name: 'Local Admin',
	username: 'admin'
} as const;

const databaseUrl = process.env.DATABASE_URL;
// The login is in the README, so it may only ever exist on this machine.
assertLocalDatabase(databaseUrl, "the local admin's password is public.");

const db = getDb(databaseUrl!);

// The site's own config minus its SvelteKit plugins, and minus the breached-password
// check, which would turn down a password that is meant to be known.
const auth = betterAuth({
	// Nothing here is served; set only so Better Auth doesn't warn about it.
	baseURL: 'http://localhost',
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: { enabled: true },
	user: {
		additionalFields: {
			username: { type: 'string', required: true, unique: true, input: true },
			role: { type: 'string', required: false, defaultValue: 'user', input: false }
		}
	}
});

const [existing] = await db
	.select({ id: user.id })
	.from(user)
	.where(eq(user.email, LOCAL_ADMIN.email))
	.limit(1);

if (existing) {
	// Back to the documented password, in case it was changed or created another way.
	const hash = await (await auth.$context).password.hash(LOCAL_ADMIN.password);
	await db
		.update(account)
		.set({ password: hash })
		.where(and(eq(account.userId, existing.id), eq(account.providerId, 'credential')));
} else {
	await auth.api.signUpEmail({
		body: {
			email: LOCAL_ADMIN.email,
			password: LOCAL_ADMIN.password,
			name: LOCAL_ADMIN.name,
			username: LOCAL_ADMIN.username
		}
	});
}

await db
	.update(user)
	.set({ role: 'admin', emailVerified: true, username: LOCAL_ADMIN.username })
	.where(eq(user.email, LOCAL_ADMIN.email));

console.info(`Local admin ready: ${LOCAL_ADMIN.email} / ${LOCAL_ADMIN.password}`);
process.exit(0);
