import { db } from '#lib/server/db.js';
import { checkins, hotSauces, makers } from '@app/db/schema';
import { error } from '@sveltejs/kit';
import { avg, desc, eq, getTableColumns, and } from 'drizzle-orm';
import { mainImage } from '#lib/server/images.js';
import { visibleSauce } from '#lib/server/sauces.js';

export async function load({ params }) {
	const slug = params.slug;

	if (!slug) {
		error(400, 'Invalid maker');
	}

	const dbMaker = await db.select().from(makers).where(eq(makers.slug, slug)).limit(1);

	if (dbMaker.length === 0) {
		error(404, 'Maker not found');
	}

	const maker = dbMaker[0];

	const sauces = await db
		.select({ ...getTableColumns(hotSauces), ...mainImage, avgRating: avg(checkins.rating) })
		.from(hotSauces)
		.where(and(eq(hotSauces.makerId, maker.makerId), visibleSauce))
		.leftJoin(checkins, eq(hotSauces.sauceId, checkins.hotSauceId))
		.groupBy(hotSauces.sauceId)
		.orderBy(desc(hotSauces.createdAt));

	return { maker, sauces };
}
