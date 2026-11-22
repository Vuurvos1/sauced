import { env } from 'cloudflare:workers';
import { DATABASE_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { getDb } from '@app/db';

type Db = ReturnType<typeof getDb>;

// `vite dev`, `vite preview` and the tests run on Node; `wrangler dev` and the
// deployed site on workerd.
const onWorkers = globalThis.navigator?.userAgent === 'Cloudflare-Workers';

// On Node: one long-lived pool.
let pool: Db | undefined;

// On Workers a socket belongs to the request that opened it, so each request gets
// its own client. That is cheap: Hyperdrive keeps the real connections to Neon warm.
const perRequest = new WeakMap<object, Db>();

function current(): Db {
	if (!onWorkers) return (pool ??= getDb(DATABASE_URL));

	const event = getRequestEvent();
	let db = perRequest.get(event);
	if (!db) {
		// Settings Cloudflare documents for postgres.js behind Hyperdrive: a few
		// connections per request, and no type lookup round trip on connect.
		db = getDb(env.HYPERDRIVE?.connectionString ?? DATABASE_URL, { max: 5, fetch_types: false });
		perRequest.set(event, db);
	}
	return db;
}

/** Resolves to the right client on every use, so it can be imported like a plain instance. */
export const db = new Proxy({} as Db, {
	get(_, property) {
		const target = current();
		const value = Reflect.get(target, property, target);
		return typeof value === 'function' ? value.bind(target) : value;
	}
});
