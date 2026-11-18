/**
 * How sauce photos are stored in the image bucket. Shared by the scraper (which
 * uploads them), `pnpm db pull` (which copies them) and the site (which shows and
 * edits them), so the three can't drift apart. Safe to import in the browser.
 */

/** Grid thumbnails and the detail page; the site picks between them with srcset. */
export const IMAGE_WIDTHS = /** @type {const} */ ([400, 800]);

/**
 * Part of every key, because files are cached as immutable: changing the widths or
 * encoding must produce new names. Bump it, then null `image_key` to re-upload.
 */
export const IMAGE_KEY_PREFIX = 'sauces/v1';

/** Files are named by their content, so a name never points at different bytes. */
export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * @param {string} key an `image_key` or `edited_key`
 * @param {number} width one of IMAGE_WIDTHS
 */
export function imageObjectName(key, width) {
	return `${key}-${width}.webp`;
}
