import { db } from '$lib/db.js';
import { stores } from '@app/db/schema';

export async function load() {
	const dbStores = await db.select().from(stores);

	return {
		stores: dbStores
	};
}
