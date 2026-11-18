import { PUBLIC_IMAGE_BASE_URL } from '$app/env/public';

/** Must match IMAGE_WIDTHS in packages/scraper/images.js. */
const WIDTHS = [400, 800] as const;
type Width = (typeof WIDTHS)[number];

type Imaged = { imageKey?: string | null; imageUrl?: string | null };

function objectUrl(key: string, width: Width) {
	return `${PUBLIC_IMAGE_BASE_URL}/${key}-${width}.webp`;
}

/** The R2 copy when there is one, otherwise the shop's original. */
export function sauceImageSrc(sauce: Imaged, width: Width = 800): string | undefined {
	if (sauce.imageKey && PUBLIC_IMAGE_BASE_URL) return objectUrl(sauce.imageKey, width);
	return sauce.imageUrl ?? undefined;
}

/** `src` and `srcset` for an `<img>`; pair with a `sizes` attribute. */
export function sauceImageAttrs(sauce: Imaged) {
	if (!sauce.imageKey || !PUBLIC_IMAGE_BASE_URL) return { src: sauce.imageUrl ?? undefined };
	return {
		src: objectUrl(sauce.imageKey, 800),
		srcset: WIDTHS.map((w) => `${objectUrl(sauce.imageKey!, w)} ${w}w`).join(', ')
	};
}
