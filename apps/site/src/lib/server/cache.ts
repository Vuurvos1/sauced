/**
 * Keeps the result of a database read that is the same for every visitor (the
 * front page's lists), so a burst of visitors or a crawler doesn't query Neon each
 * time: it bills for time awake, and every query wakes it.
 *
 * In memory, so per server instance: it cuts queries a lot but not to zero, and
 * each instance can be up to `ttlMs` behind. Only for data that may be that stale
 * and that doesn't depend on who is asking.
 */
const entries = new Map<string, { expires: number; value: Promise<unknown> }>();

/** Plenty for a handful of public lists; stops a bug from growing it unbounded. */
const MAX_ENTRIES = 100;

/** The front page's lists, dropped when an admin changes a sauce. */
export const HOME_CACHE_KEY = 'home';

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = entries.get(key);
	if (hit && hit.expires > now) return hit.value as Promise<T>;

	// Stored as the promise, so visitors arriving while it loads share one query.
	const value = load();
	entries.set(key, { expires: now + ttlMs, value });
	// A failed read isn't kept: the next request tries again.
	value.catch(() => {
		if (entries.get(key)?.value === value) entries.delete(key);
	});

	if (entries.size > MAX_ENTRIES) {
		for (const [name, entry] of entries) if (entry.expires <= now) entries.delete(name);
		if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
	}
	return value;
}

/** Drops one entry, after a write that changes what it holds. */
export function forget(key: string) {
	entries.delete(key);
}

/** For tests. */
export function clearCache() {
	entries.clear();
}
