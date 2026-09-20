import { db } from '$lib/server/db.js';
import { stores } from '@app/db/schema';
import { desc } from 'drizzle-orm';
import { matchSimilarity, matchTier, matchesQuery, normalizeQuery } from '$lib/server/search';

export async function load({ url }) {
	const search = normalizeQuery(url.searchParams.get('q'));

	const query = db.select().from(stores);
	const dbStores = search
		? await query
				.where(matchesQuery(stores.name, search))
				.orderBy(desc(matchTier(stores.name, search)), desc(matchSimilarity(stores.name, search)))
		: await query.orderBy(stores.name);

	return {
		stores: dbStores,
		search
	};
}
