import { flushSync } from 'svelte';

export const SAUCE_IMAGE = 'sauce-image';

type Claim = { section: string; slug: string };

let claimed = $state<Claim | null>(null);

export const sharedSauce = {
	get slug() {
		return claimed?.slug ?? null;
	},

	claim(section: string, slug: string) {
		claimed = { section, slug };
		// Must be in the DOM before SvelteKit's click handler snapshots.
		flushSync();
	},

	release() {
		claimed = null;
		flushSync();
	}
};

// Keyed by section as well as slug: the home page runs recentSauces and
// topSauces as separate queries, so one sauce can render in both grids, and a
// duplicate view-transition-name makes Chrome abort the whole transition.
export function sauceImageName(section: string, slug: string) {
	return claimed?.section === section && claimed.slug === slug ? SAUCE_IMAGE : undefined;
}

// Modifier and middle clicks open a new tab, so there is nothing to animate and
// the claim would go stale.
export function claimOnNavigate(event: MouseEvent, section: string, slug: string) {
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return;
	}

	sharedSauce.claim(section, slug);
}

let skipNext = false;

// For navigation that isn't "open this sauce": a bottle sliding to wherever it
// happens to sit in the destination grid reads as a glitch, not continuity.
export function skipViewTransition(event: MouseEvent) {
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return;
	}

	skipNext = true;
	sharedSauce.release();
}

export function takeSkip() {
	const skip = skipNext;
	skipNext = false;
	return skip;
}
