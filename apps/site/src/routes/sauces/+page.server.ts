import { db } from '$lib/db';
import { hotSauces, checkins } from '@app/db/schema';
import { type Actions } from '@sveltejs/kit';
import { eq, avg, count, desc, ilike, getTableColumns } from 'drizzle-orm';

export async function load({ url }) {
	const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
	const pageSize = 24;

	const search = url.searchParams.get('q') ?? '';

	const sauceCount = await db
		.select({ count: count() })
		.from(hotSauces)
		.where(ilike(hotSauces.name, `%${search}%`));

	const hotSauceColumns = getTableColumns(hotSauces);
	const sauces = await db
		.select({
			...hotSauceColumns,
			avgRating: avg(checkins.rating)
		})
		.from(hotSauces)
		.where(ilike(hotSauces.name, `%${search}%`))
		.limit(pageSize)
		.offset((page - 1) * pageSize) // TODO: check if filtering before or after the join is faster
		.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
		.groupBy(hotSauces.sauceId)
		.orderBy(desc(hotSauces.createdAt));

	return { sauces, sauceCount: sauceCount[0].count, pageSize };
}

export const actions: Actions = {};
