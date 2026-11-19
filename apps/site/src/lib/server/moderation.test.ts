import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/server', () => ({ getRequestEvent: () => ({ platform: undefined }) }));
vi.mock('$app/env/private', () => ({
	CLOUDFLARE_ACCOUNT_ID: undefined,
	CLOUDFLARE_AI_TOKEN: undefined,
	CLOUDFLARE_API_BASE_URL: undefined
}));
const { isFlagged, workersAiRest } = await import('./moderation.js');

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

describe('workersAiRest', () => {
	it('posts to the account and unwraps the result', async () => {
		const fetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ success: true, result: { response: { safe: false } } }))
		);
		vi.stubGlobal('fetch', fetch);
		try {
			expect(await isFlagged('…', workersAiRest('acc', 'tok'))).toBe(true);
			const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
			expect(url).toBe(
				'https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/meta/llama-guard-3-8b'
			);
			expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('saves unflagged when the API refuses', async () => {
		vi.stubGlobal('fetch', async () => new Response('{}', { status: 401 }));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(await isFlagged('…', workersAiRest('acc', 'bad'))).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
