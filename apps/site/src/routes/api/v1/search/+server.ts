import { checkins, hotSauces, makers, stores } from '@app/db/schema';
import { avg, desc, eq, count, and } from 'drizzle-orm';
import {
	MIN_SEARCH_LENGTH,
	matchSimilarity,
	matchTier,
	matchesQuery,
	normalizeQuery,
	sauceMatchesQuery,
	withFuzzyMatching
} from '#lib/server/search.js';
import type { SearchResponse } from '#lib/types/api.js';
import { mainImage } from '#lib/server/images.js';
import { visibleSauce } from '#lib/server/sauces.js';

const EMPTY: SearchResponse = { makers: [], stores: [], sauces: [] };

const RESULT_LIMIT = 8;

export async function GET({ url }) {
	const query = normalizeQuery(url.searchParams.get('q'));

	if (query.length < MIN_SEARCH_LENGTH) {
		return Response.json(EMPTY satisfies SearchResponse);
	}

	try {
		const [sauceResults, storeResults, makerResults] = await withFuzzyMatching(async (tx) => {
			const sauceQuery = tx
				.select({
					sauceId: hotSauces.sauceId,
					name: hotSauces.name,
					description: hotSauces.description,
					slug: hotSauces.slug,
					...mainImage,
					avgRating: avg(checkins.rating).mapWith(Number),
					ratingCount: count(checkins.rating)
				})
				.from(hotSauces)
				.where(and(sauceMatchesQuery(query), visibleSauce))
				.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
				.groupBy(hotSauces.sauceId)
				.orderBy(
					desc(matchTier(hotSauces.name, query)),
					desc(matchSimilarity(hotSauces.name, query)),
					desc(count(checkins.rating)),
					desc(avg(checkins.rating))
				)
				.limit(RESULT_LIMIT);

			const storeQuery = tx
				.select({
					id: stores.storeId,
					name: stores.name,
					slug: stores.slug,
					description: stores.description
				})
				.from(stores)
				.where(matchesQuery(stores.name, query))
				.orderBy(desc(matchTier(stores.name, query)), desc(matchSimilarity(stores.name, query)))
				.limit(RESULT_LIMIT);

			const makerQuery = tx
				.select({
					id: makers.makerId,
					name: makers.name,
					slug: makers.slug,
					sauceCount: count(hotSauces.sauceId)
				})
				.from(makers)
				.where(matchesQuery(makers.name, query))
				.leftJoin(hotSauces, and(eq(hotSauces.makerId, makers.makerId), visibleSauce))
				.groupBy(makers.makerId)
				.orderBy(desc(matchTier(makers.name, query)), desc(count(hotSauces.sauceId)))
				.limit(RESULT_LIMIT);

			return Promise.all([sauceQuery, storeQuery, makerQuery]);
		});

		return Response.json({
			makers: makerResults,
			stores: storeResults,
			sauces: sauceResults
		} satisfies SearchResponse);
	} catch (error) {
		console.error('Search error:', error);
		return Response.json(EMPTY satisfies SearchResponse, { status: 500 });
	}
}
