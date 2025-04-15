import { db } from '$lib/db';
import { checkins, hotSauces, userTable } from '@app/db/schema';
import { error, fail } from '@sveltejs/kit';
import { getAchievements } from '$lib/server/achievements';
import { and, count, desc, eq, isNotNull, getTableColumns, not } from 'drizzle-orm';

export async function load({ params }) {
	const username = params.slug;

	if (!username) {
		error(400, 'Invalid user');
	}

	try {
		const users = await db
			.select({
				id: userTable.id,
				username: userTable.username
			})
			.from(userTable)
			.where(eq(userTable.username, username))
			.limit(1);

		if (users.length === 0) {
			error(404, 'User not found');
		}

		const user = users[0];

		const hotSauceColumns = getTableColumns(hotSauces);
		const checkedSauces = await db
			.select({
				...hotSauceColumns,
				rating: checkins.rating,
				review: checkins.review,
				checkedAt: checkins.createdAt
			})
			.from(checkins)
			.innerJoin(hotSauces, eq(checkins.hotSauceId, hotSauces.sauceId))
			.where(eq(checkins.userId, user.id))
			.orderBy(desc(checkins.createdAt))
			.limit(12);

		const reviewCount = await db
			.select({
				count: count()
			})
			.from(checkins)
			.where(
				and(eq(checkins.userId, user.id), isNotNull(checkins.review), not(eq(checkins.review, '')))
			);

		const sauceTriedCount = await db
			.select({
				count: count()
			})
			.from(checkins)
			.where(eq(checkins.userId, user.id));

		const achievements = await getAchievements(user);

		return {
			user,
			checkedSauces,
			reviewCount: reviewCount[0].count,
			sauceTriedCount: sauceTriedCount[0].count,
			achievements
		};
	} catch (err) {
		console.error(err);
		error(500, 'Internal server error');
	}
}

export const actions = {
	removeCheckIn: async ({ request, locals: { session, user } }) => {
		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const sauceId = (data.get('sauceId') || '') as string;

		if (!sauceId) {
			return fail(400, { error: 'Missing sauceId' });
		}

		try {
			await db
				.delete(checkins)
				.where(and(eq(checkins.hotSauceId, sauceId), eq(checkins.userId, user.id)));
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to delete check-in' });
		}

		return { success: true };
	}
};
