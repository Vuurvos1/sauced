import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { invalidateSession, deleteSessionTokenCookie } from '$lib/server/session';
import { db } from '$lib/db';
import { checkins, hotSauces } from '@app/db/schema';
import { avg, desc, getTableColumns, eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const recentSauces = await db
		.select()
		.from(hotSauces)
		.orderBy(desc(hotSauces.createdAt))
		.limit(12);

	const hotSauceColumns = getTableColumns(hotSauces);
	const topSauces = await db
		.select({
			...hotSauceColumns,
			avgRating: avg(checkins.rating).mapWith(Number),
			ratingCount: count(checkins.rating)
		})
		.from(hotSauces)
		.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
		.groupBy(hotSauces.sauceId)
		.orderBy(desc(count(checkins.rating)), desc(avg(checkins.rating)))
		.limit(8);

	return {
		recentSauces,
		topSauces
	};
};

export const actions: Actions = {
	logout: async ({ locals, cookies }) => {
		if (!locals.session) {
			return fail(401);
		}
		await invalidateSession(locals.session.id);

		deleteSessionTokenCookie(cookies);

		return redirect(302, '/login');
	}
};
