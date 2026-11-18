import { db } from '#lib/server/db.js';
import { hotSauces, makers } from '@app/db/schema';
import { count, desc, eq, and } from 'drizzle-orm';
import {
	type Executor,
	matchSimilarity,
	matchTier,
	matchesQuery,
	normalizeQuery,
	withFuzzyMatching
} from '#lib/server/search.js';
import { visibleSauce } from '#lib/server/sauces.js';

export async function load({ url }) {
	const search = normalizeQuery(url.searchParams.get('q'));

	const run = (executor: Executor) =>
		executor
			.select({
				makerId: makers.makerId,
				name: makers.name,
				slug: makers.slug,
				sauceCount: count(hotSauces.sauceId)
			})
			.from(makers)
			.where(search ? matchesQuery(makers.name, search) : undefined)
			.leftJoin(hotSauces, and(eq(hotSauces.makerId, makers.makerId), visibleSauce))
			.groupBy(makers.makerId)
			.orderBy(
				...(search
					? [desc(matchTier(makers.name, search)), desc(matchSimilarity(makers.name, search))]
					: []),
				desc(count(hotSauces.sauceId)),
				makers.name
			);

	const dbMakers = search ? await withFuzzyMatching(run) : await run(db);

	return { makers: dbMakers, search };
}
