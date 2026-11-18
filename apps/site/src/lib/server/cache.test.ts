import { afterEach, describe, expect, it, vi } from 'vitest';
import { cached, clearCache } from './cache.js';

afterEach(() => {
	clearCache();
	vi.useRealTimers();
});

describe('cached', () => {
	it('reads once per TTL, sharing one read between concurrent callers', async () => {
		vi.useFakeTimers();
		const load = vi.fn(async () => 'rows');

		await Promise.all([cached('k', 1000, load), cached('k', 1000, load)]);
		await cached('k', 1000, load);
		expect(load).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1001);
		await cached('k', 1000, load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it("doesn't keep a failed read", async () => {
		const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('rows');

		await expect(cached('k', 1000, load)).rejects.toThrow('down');
		await expect(cached('k', 1000, load)).resolves.toBe('rows');
	});

	it('starts over after clearCache', async () => {
		const load = vi.fn(async () => 'rows');
		await cached('k', 1000, load);
		clearCache();
		await cached('k', 1000, load);
		expect(load).toHaveBeenCalledTimes(2);
	});
});
