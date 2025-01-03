import { db } from '$lib/db';
import { hotSauces, userTable, wishlist } from '@app/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const username = params.slug;

	const dbUser = await db.select().from(userTable).where(eq(userTable.username, username)).limit(1);

	if (dbUser.length === 0) {
		error(404, 'User not found');
	}

	const user = dbUser[0];

	const dbRes = await db
		.select({
			hotSauces: hotSauces
		})
		.from(wishlist)
		.leftJoin(hotSauces, eq(wishlist.hotSauceId, hotSauces.sauceId))
		.where(eq(wishlist.userId, user.id));

	const sauces = dbRes.map((row) => row.hotSauces).filter((sauce) => !!sauce);

	return { sauces: sauces };
}
