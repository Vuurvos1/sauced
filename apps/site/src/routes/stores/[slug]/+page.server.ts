import { db } from '$lib/server/db';
import { hotSauces, stores, storeHotSauces } from '@app/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const storeName = params.slug;

	if (!storeName) {
		error(400, 'Invalid store name');
	}

	const dbStore = await db.select().from(stores).where(eq(stores.name, storeName));
	if (dbStore.length === 0) {
		error(404, 'Store not found');
	}

	// get 24 most recent sauces
	const dbStoreSauces = await db
		.select({
			sauce: hotSauces,
			storeInfo: storeHotSauces
		})
		.from(hotSauces)
		.innerJoin(storeHotSauces, eq(hotSauces.sauceId, storeHotSauces.sauceId))
		.where(eq(storeHotSauces.storeId, dbStore[0].storeId))
		// .orderBy(storeHotSauces.createdAt.desc())
		.limit(52);

	return {
		store: dbStore[0],
		sauces: dbStoreSauces
	};
}
