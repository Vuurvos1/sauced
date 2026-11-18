import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.js';
import { db } from '#lib/server/db.js';
import { checkins, hotSauces, makers } from '@app/db/schema';
import { avg, desc, getTableColumns, eq, count } from 'drizzle-orm';
import { mainImage } from '#lib/server/images.js';
import { cached } from '#lib/server/cache.js';
import { visibleSauce } from '#lib/server/sauces.js';

/** How stale the front page's lists may get: a new sauce or rating shows within this. */
const HOME_TTL_MS = 5 * 60 * 1000;

export const load: PageServerLoad = async () => {
	const hotSauceColumns = { ...getTableColumns(hotSauces), ...mainImage };
	const recentSaucesQuery = db
		.select({ ...hotSauceColumns, makerName: makers.name })
		.from(hotSauces)
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(visibleSauce)
		.orderBy(desc(hotSauces.createdAt))
		.limit(12);

	const topSaucesQuery = db
		.select({
			...hotSauceColumns,
			makerName: makers.name,
			avgRating: avg(checkins.rating).mapWith(Number),
			ratingCount: count(checkins.rating)
		})
		.from(hotSauces)
		.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(visibleSauce)
		.groupBy(hotSauces.sauceId, makers.name)
		.orderBy(desc(count(checkins.rating)), desc(avg(checkins.rating)))
		.limit(8);

	// The same for everyone, and fine a few minutes stale.
	const [recentSauces, topSauces] = await cached('home', HOME_TTL_MS, () =>
		Promise.all([recentSaucesQuery, topSaucesQuery])
	);

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
