const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 2000;
/** Caps a shop's Retry-After, so one throttled store cannot stall the whole run. */
const MAX_RETRY_AFTER_MS = 30_000;

/**
 * Shops answer the odd 503 or 429 under load, which failed whole CI runs.
 * @param {number} status
 */
function isRetryableStatus(status) {
	return status === 429 || status >= 500;
}

/**
 * A domain that does not resolve is gone, not busy; retrying only slows the run.
 * @param {unknown} error
 */
function isRetryableError(error) {
	const cause = /** @type {{ cause?: { code?: string } }} */ (error).cause;
	return cause?.code !== 'ENOTFOUND';
}

/**
 * @param {Response} response
 * @param {number} attempt
 */
function retryDelayMs(response, attempt) {
	const retryAfter = Number(response.headers.get('retry-after'));
	return retryAfter > 0
		? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)
		: RETRY_BASE_MS * 2 ** attempt;
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function fetchPage(url, init = {}) {
	for (let attempt = 0; ; attempt++) {
		const isLast = attempt === MAX_ATTEMPTS - 1;
		/** @type {Response} */
		let response;
		try {
			response = await fetch(url, {
				...init,
				headers: {
					'User-Agent': USER_AGENT,
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.5',
					...(init.headers ?? {})
				}
			});
		} catch (error) {
			if (isLast || !isRetryableError(error)) throw error;
			await sleep(RETRY_BASE_MS * 2 ** attempt);
			continue;
		}

		if (isLast || !isRetryableStatus(response.status)) return response;
		console.warn(`${url} responded ${response.status}, retrying`);
		await sleep(retryDelayMs(response, attempt));
	}
}
