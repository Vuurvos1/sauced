import { db } from '$lib/server/db';
import { hotSauces, makers, user as userTable, wishlist } from '@app/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const username = params.slug;

	if (!username) {
		error(400, 'Invalid user');
	}

	const dbUser = await db
		.select({ id: userTable.id, username: userTable.username })
		.from(userTable)
		.where(eq(userTable.username, username))
		.limit(1);

	if (dbUser.length === 0) {
		error(404, 'User not found');
	}

	const user = dbUser[0];

	const dbRes = await db
		.select({
			hotSauces: hotSauces,
			makerName: makers.name
		})
		.from(wishlist)
		.leftJoin(hotSauces, eq(wishlist.hotSauceId, hotSauces.sauceId))
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(eq(wishlist.userId, user.id));

	const sauces = dbRes.flatMap((row) =>
		row.hotSauces ? [{ ...row.hotSauces, makerName: row.makerName }] : []
	);

	return { username: user.username, sauces };
}
