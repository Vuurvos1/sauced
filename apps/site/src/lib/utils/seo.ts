export const SITE_NAME = 'Sauced';

export const SITE_DESCRIPTION =
	'Find hot sauces, see how they rate and where to buy them. Sauced tracks bottles from makers and stores, and what people think of them.';

const MAX_DESCRIPTION = 160;

export const formatTitle = (title?: string | null, brandFirst = false) => {
	if (!title) return SITE_NAME;

	return brandFirst ? `${SITE_NAME} · ${title}` : `${title} · ${SITE_NAME}`;
};

/**
 * Search engines cut a description off around 160 characters mid-word; trim it
 * on a word boundary instead. Returns null for anything with no words in it, so
 * callers can fall back.
 */
export function metaDescription(
	text: string | null | undefined,
	max = MAX_DESCRIPTION
): string | null {
	const collapsed = text?.replace(/\s+/g, ' ').trim();

	if (!collapsed) return null;
	if (collapsed.length <= max) return collapsed;

	const cut = collapsed.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(' ');

	// A "word" longer than half the budget is something like a URL; hard-cut it.
	const trimmed = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;

	return `${trimmed.replace(/[\s,;:.!?-]+$/, '')}…`;
}
