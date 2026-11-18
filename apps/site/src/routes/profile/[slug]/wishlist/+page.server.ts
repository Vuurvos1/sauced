import { db } from '#lib/server/db.js';
import { hotSauces, makers, user as userTable, wishlist } from '@app/db/schema';
import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { mainImage } from '#lib/server/images.js';
import { visibleSauce } from '#lib/server/sauces.js';

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
			...mainImage,
			makerName: makers.name
		})
		.from(wishlist)
		.leftJoin(hotSauces, and(eq(wishlist.hotSauceId, hotSauces.sauceId), visibleSauce))
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(eq(wishlist.userId, user.id));

	const sauces = dbRes.flatMap((row) =>
		row.hotSauces
			? [
					{
						...row.hotSauces,
						imageKey: row.imageKey,
						imageUrl: row.imageUrl,
						makerName: row.makerName
					}
				]
			: []
	);

	return { username: user.username, sauces };
}
