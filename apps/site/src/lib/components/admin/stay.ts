import type { SubmitFunction } from '$app/forms';
import { invalidateAll } from '$app/navigation';

/**
 * For forms that post to the admin route's actions from the sauce page. SvelteKit's
 * default would navigate to that route; this refreshes the page we're on instead and
 * hands back any error message. A redirect (on to the next sauce) is left to the
 * default.
 */
export function stayHere(onError: (message: string) => void): SubmitFunction {
	return () => {
		onError('');
		return async ({ result, update }) => {
			if (result.type === 'success' || result.type === 'failure') {
				if (result.type === 'failure') onError(String(result.data?.error ?? 'That didn’t work'));
				await invalidateAll();
			} else {
				await update();
			}
		};
	};
}

/** The admin route that owns the editing actions. */
export const adminAction = (slug: string, name: string) =>
	`/admin/sauces/${encodeURIComponent(slug)}?/${name}`;
