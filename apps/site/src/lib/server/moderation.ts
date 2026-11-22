import { env } from 'cloudflare:workers';
import {
	CLOUDFLARE_ACCOUNT_ID,
	CLOUDFLARE_AI_TOKEN,
	CLOUDFLARE_API_BASE_URL
} from '$app/env/private';

/**
 * Llama Guard: classifies a message as safe or unsafe against a fixed list of
 * harm categories. Small, and only ever sent review text, which is capped at
 * REVIEW_MAX_LENGTH characters.
 */
const MODEL = '@cf/meta/llama-guard-3-8b';

/** The slice of the Workers AI binding this uses; the full type comes with wrangler. */
export type AiBinding = { run(model: string, input: unknown): Promise<unknown> };

/**
 * Whether review text should be held back from other visitors.
 *
 * Runs on Workers AI: through the site's binding on Workers, or its REST API where
 * CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN are set. Without either, or if the
 * call fails, the review goes up unflagged. A review never fails to save
 * because moderation is unavailable, and the cost is bounded by the number of
 * reviews written: callers only ask about new or changed text.
 */
export async function isFlagged(text: string, ai = aiBinding()): Promise<boolean> {
	if (!ai) return false;
	try {
		const result = (await ai.run(MODEL, { messages: [{ role: 'user', content: text }] })) as {
			response?: { safe?: boolean } | string;
		};
		const verdict = result?.response;
		// The model answers in JSON when it can, and with plain "safe"/"unsafe" text
		// otherwise.
		if (typeof verdict === 'string') return /\bunsafe\b/i.test(verdict);
		return verdict?.safe === false;
	} catch (error) {
		console.error('Moderation unavailable, saving review unflagged:', error);
		return false;
	}
}

function aiBinding(): AiBinding | undefined {
	// Bound on the deployed Workers only; locally this falls through to the stand-in.
	const binding = env.AI as AiBinding | undefined;
	if (binding) return binding;
	if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_AI_TOKEN) {
		return workersAiRest(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_TOKEN, CLOUDFLARE_API_BASE_URL);
	}
}

/** Saving a review waits on this, so a slow answer counts as no answer. */
const REST_TIMEOUT_MS = 5000;

/** Workers AI's REST API, shaped like the binding. */
export function workersAiRest(
	accountId: string,
	token: string,
	base = 'https://api.cloudflare.com/client/v4'
): AiBinding {
	return {
		async run(model, input) {
			const response = await fetch(
				`${base.replace(/\/$/, '')}/accounts/${accountId}/ai/run/${model}`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify(input),
					signal: AbortSignal.timeout(REST_TIMEOUT_MS)
				}
			);
			if (!response.ok) throw new Error(`Workers AI responded ${response.status}`);
			// The REST API wraps what the binding returns in `result`.
			return ((await response.json()) as { result?: unknown }).result;
		}
	};
}
