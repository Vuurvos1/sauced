import { getRequestEvent } from '$app/server';

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
 * Runs on Workers AI when the site has the binding (on Workers); anywhere else, or
 * if the call fails, the review goes up unflagged. A review never fails to save
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
	const platform = getRequestEvent().platform as { env?: { AI?: AiBinding } } | undefined;
	return platform?.env?.AI;
}
