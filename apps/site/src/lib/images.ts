import { PUBLIC_IMAGE_BASE_URL } from '$app/env/public';
import { IMAGE_WIDTHS, imageObjectName } from '@app/db/images';
import placeholder from '#lib/assets/sauce-placeholder.svg';

/** Shown for a sauce without a photo, or one whose photo fails to load. */
export const SAUCE_PLACEHOLDER = placeholder;

type Width = (typeof IMAGE_WIDTHS)[number];

type Imaged = { imageKey?: string | null; imageUrl?: string | null };

function objectUrl(key: string, width: Width) {
	return `${PUBLIC_IMAGE_BASE_URL}/${imageObjectName(key, width)}`;
}

/** The R2 copy when there is one, the shop's original otherwise, else the placeholder. */
export function sauceImageSrc(sauce: Imaged, width: Width = 800): string {
	if (sauce.imageKey && PUBLIC_IMAGE_BASE_URL) return objectUrl(sauce.imageKey, width);
	return sauce.imageUrl || SAUCE_PLACEHOLDER;
}

/**
 * A shop's link can die after we stored it; swap in the placeholder rather than
 * show a broken image. Svelte replays errors that fire before hydration.
 */
export function showPlaceholder(event: Event) {
	const image = event.currentTarget as HTMLImageElement;
	if (image.src.endsWith(SAUCE_PLACEHOLDER)) return;
	image.removeAttribute('srcset');
	image.src = SAUCE_PLACEHOLDER;
}

/** `src`, `srcset` and the broken-image fallback for an `<img>`; pair with `sizes`. */
export function sauceImageAttrs(sauce: Imaged) {
	if (!sauce.imageKey || !PUBLIC_IMAGE_BASE_URL) {
		return { src: sauce.imageUrl || SAUCE_PLACEHOLDER, onerror: showPlaceholder };
	}
	return {
		src: objectUrl(sauce.imageKey, 800),
		srcset: IMAGE_WIDTHS.map((w) => `${objectUrl(sauce.imageKey!, w)} ${w}w`).join(', '),
		onerror: showPlaceholder
	};
}
