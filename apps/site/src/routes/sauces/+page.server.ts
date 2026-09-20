import { db } from '$lib/server/db';
import { hotSauces, checkins } from '@app/db/schema';
import { type Actions } from '@sveltejs/kit';
import { eq, avg, count, desc, getTableColumns } from 'drizzle-orm';
import {
	type Executor,
	matchSimilarity,
	matchTier,
	normalizeQuery,
	sauceMatchesQuery,
	withFuzzyMatching
} from '$lib/server/search';

export async function load({ url }) {
	const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
	const pageSize = 24;

	const search = normalizeQuery(url.searchParams.get('q'));
	const filter = search ? sauceMatchesQuery(search) : undefined;

	// Relevance only means something while searching; otherwise show the newest first.
	const order = search
		? [
				desc(matchTier(hotSauces.name, search)),
				desc(matchSimilarity(hotSauces.name, search)),
				desc(hotSauces.createdAt)
			]
		: [desc(hotSauces.createdAt)];

	const hotSauceColumns = getTableColumns(hotSauces);
	const run = (executor: Executor) => {
		const sauceCountQuery = executor.select({ count: count() }).from(hotSauces).where(filter);

		const sauceQuery = executor
			.select({
				...hotSauceColumns,
				avgRating: avg(checkins.rating)
			})
			.from(hotSauces)
			.where(filter)
			.limit(pageSize)
			.offset((page - 1) * pageSize) // TODO: check if filtering before or after the join is faster
			.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
			.groupBy(hotSauces.sauceId)
			.orderBy(...order);

		return Promise.all([sauceCountQuery, sauceQuery]);
	};

	// Only a search needs the lowered trigram threshold, so browsing stays out of a transaction.
	const [sauceCount, sauces] = search ? await withFuzzyMatching(run) : await run(db);

	return { sauces, sauceCount: sauceCount[0].count, pageSize, search };
}

export const actions: Actions = {};
