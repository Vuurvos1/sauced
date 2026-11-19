/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight, in order of
 * the list.
 *
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<void>} fn
 */
export async function forEachConcurrent(items, concurrency, fn) {
	let next = 0;
	async function worker() {
		while (next < items.length) await fn(items[next++]);
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
