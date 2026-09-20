import { db } from '$lib/server/db.js';
import { stores } from '@app/db/schema';
import { desc } from 'drizzle-orm';
import {
	type Executor,
	matchSimilarity,
	matchTier,
	matchesQuery,
	normalizeQuery,
	withFuzzyMatching
} from '$lib/server/search';

export async function load({ url }) {
	const search = normalizeQuery(url.searchParams.get('q'));

	const dbStores = search
		? await withFuzzyMatching((tx: Executor) =>
				tx
					.select()
					.from(stores)
					.where(matchesQuery(stores.name, search))
					.orderBy(desc(matchTier(stores.name, search)), desc(matchSimilarity(stores.name, search)))
			)
		: await db.select().from(stores).orderBy(stores.name);

	return {
		stores: dbStores,
		search
	};
}
