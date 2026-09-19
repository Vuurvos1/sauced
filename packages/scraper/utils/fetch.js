const USER_AGENT =
	'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export function fetchPage(url, init = {}) {
	return fetch(url, {
		...init,
		headers: {
			'User-Agent': USER_AGENT,
			Accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
			...(init.headers ?? {})
		}
	});
}
