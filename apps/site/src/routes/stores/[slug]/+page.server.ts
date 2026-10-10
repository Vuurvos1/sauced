import { db } from '#lib/server/db.js';
import { hotSauces, makers, stores, storeHotSauces } from '@app/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const slug = params.slug;

	if (!slug) {
		error(400, 'Invalid store');
	}

	const dbStore = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
	if (dbStore.length === 0) {
		// Store pages used to be keyed on the name, and those URLs are indexed.
		const [legacy] = await db
			.select({ slug: stores.slug })
			.from(stores)
			.where(eq(stores.name, slug))
			.limit(1);
		if (legacy) redirect(301, `/stores/${legacy.slug}`);

		error(404, 'Store not found');
	}

	// get 24 most recent sauces
	const dbStoreSauces = await db
		.select({
			sauce: hotSauces,
			storeInfo: storeHotSauces,
			makerName: makers.name
		})
		.from(hotSauces)
		.innerJoin(storeHotSauces, eq(hotSauces.sauceId, storeHotSauces.sauceId))
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(eq(storeHotSauces.storeId, dbStore[0].storeId))
		// .orderBy(storeHotSauces.createdAt.desc())
		.limit(52);

	return {
		store: dbStore[0],
		sauces: dbStoreSauces
	};
}
