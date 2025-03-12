import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { checkins, hotSauces, stores } from '@app/db/schema';
import { avg, desc, eq, count, ilike } from 'drizzle-orm';
import type { SearchResponse } from '$lib/types/api';

export async function GET({ url }) {
	const query = url.searchParams.get('q');

	if (!query || query.length < 2) {
		return json({
			makers: [],
			stores: [],
			sauces: []
		} satisfies SearchResponse);
	}

	try {
		const searchResults = await db
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
			.where(ilike(hotSauces.name, `%${query}%`)) // TODO: turn into a fuzzy search
			.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
			.groupBy(hotSauces.sauceId)
			.orderBy(desc(count(checkins.rating)), desc(avg(checkins.rating)))
			.limit(8);

		const storesResults = await db
			.select({
				id: stores.storeId,
				name: stores.name,
				description: stores.description
			})
			.from(stores)
			.where(ilike(stores.name, `%${query}%`))
			.limit(8);

		return json({
			makers: [],
			stores: storesResults,
			sauces: searchResults
		} satisfies SearchResponse);
	} catch (error) {
		console.error('Search error:', error);
		return json(
			{
				makers: [],
				stores: [],
				sauces: []
			} satisfies SearchResponse,
			{ status: 500 }
		);
	}
}
