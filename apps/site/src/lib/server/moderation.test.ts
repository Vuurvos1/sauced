import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/server', () => ({ getRequestEvent: () => ({ platform: undefined }) }));
const { isFlagged } = await import('./moderation.js');

const ai = (response: unknown) => ({ run: vi.fn(async () => ({ response })) });

describe('isFlagged', () => {
	it('flags what the model calls unsafe, in either answer format', async () => {
		expect(await isFlagged('…', ai({ safe: false, categories: ['S10'] }))).toBe(true);
		expect(await isFlagged('…', ai('unsafe\nS10'))).toBe(true);
	});

	it('lets safe text through', async () => {
		expect(await isFlagged('Great on tacos', ai({ safe: true }))).toBe(false);
		expect(await isFlagged('Great on tacos', ai('safe'))).toBe(false);
	});

	it('never blocks a review when moderation is unavailable', async () => {
		expect(await isFlagged('Great on tacos')).toBe(false);
		const failing = { run: vi.fn(async () => Promise.reject(new Error('quota'))) };
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await isFlagged('Great on tacos', failing)).toBe(false);
	});
});
