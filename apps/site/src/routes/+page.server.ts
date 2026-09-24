import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { checkins, hotSauces, makers } from '@app/db/schema';
import { avg, desc, getTableColumns, eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const hotSauceColumns = getTableColumns(hotSauces);
	const recentSauces = await db
		.select({ ...hotSauceColumns, makerName: makers.name })
		.from(hotSauces)
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.orderBy(desc(hotSauces.createdAt))
		.limit(12);

	const topSauces = await db
		.select({
			...hotSauceColumns,
			makerName: makers.name,
			avgRating: avg(checkins.rating).mapWith(Number),
			ratingCount: count(checkins.rating)
		})
		.from(hotSauces)
		.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.groupBy(hotSauces.sauceId, makers.name)
		.orderBy(desc(count(checkins.rating)), desc(avg(checkins.rating)))
		.limit(8);

	return {
		recentSauces,
		topSauces
	};
};

export const actions: Actions = {
	logout: async ({ locals, request }) => {
		if (!locals.session) {
			return fail(401);
		}

		await auth.api.signOut({ headers: request.headers });

		return redirect(302, '/login');
	}
};
