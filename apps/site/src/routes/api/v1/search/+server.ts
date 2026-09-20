import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { checkins, hotSauces, stores } from '@app/db/schema';
import { avg, desc, eq, count } from 'drizzle-orm';
import {
	MIN_SEARCH_LENGTH,
	matchSimilarity,
	matchTier,
	matchesQuery,
	normalizeQuery,
	sauceMatchesQuery
} from '$lib/server/search';
import type { SearchResponse } from '$lib/types/api';

const EMPTY: SearchResponse = { makers: [], stores: [], sauces: [] };

const RESULT_LIMIT = 8;

export async function GET({ url }) {
	const query = normalizeQuery(url.searchParams.get('q'));

	if (query.length < MIN_SEARCH_LENGTH) {
		return json(EMPTY satisfies SearchResponse);
	}

	try {
		const sauceQuery = db
			.select({
				sauceId: hotSauces.sauceId,
				name: hotSauces.name,
				description: hotSauces.description,
				slug: hotSauces.slug,
				imageUrl: hotSauces.imageUrl,
				avgRating: avg(checkins.rating).mapWith(Number),
				ratingCount: count(checkins.rating)
			})
			.from(hotSauces)
			.where(sauceMatchesQuery(query))
			.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
			.groupBy(hotSauces.sauceId)
			.orderBy(
				desc(matchTier(hotSauces.name, query)),
				desc(matchSimilarity(hotSauces.name, query)),
				desc(count(checkins.rating)),
				desc(avg(checkins.rating))
			)
			.limit(RESULT_LIMIT);

		const storeQuery = db
			.select({
				id: stores.storeId,
				name: stores.name,
				description: stores.description
			})
			.from(stores)
			.where(matchesQuery(stores.name, query))
			.orderBy(desc(matchTier(stores.name, query)), desc(matchSimilarity(stores.name, query)))
			.limit(RESULT_LIMIT);

		const [sauceResults, storeResults] = await Promise.all([sauceQuery, storeQuery]);

		return json({
			makers: [],
			stores: storeResults,
			sauces: sauceResults
		} satisfies SearchResponse);
	} catch (error) {
		console.error('Search error:', error);
		return json(EMPTY satisfies SearchResponse, { status: 500 });
	}
}
