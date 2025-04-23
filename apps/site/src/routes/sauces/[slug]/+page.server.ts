import { db } from '$lib/db';
import { checkins, hotSauces, userTable, wishlist, stores, storeHotSauces } from '@app/db/schema';
import { error, fail } from '@sveltejs/kit';
import { and, eq, not } from 'drizzle-orm';

// TODO: fix tensorflow issues
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as tf from '@tensorflow/tfjs';

export async function load({ params, locals: { user } }) {
	const slug = params.slug;

	if (!slug) {
		error(400, 'Invalid sauce');
	}

	const dbSauce = await db.select().from(hotSauces).where(eq(hotSauces.slug, slug)).limit(1);

	if (dbSauce.length === 0) {
		error(404, 'Sauce not found');
	}

	const sauce = dbSauce[0];
	const { sauceId } = sauce;

	const dbStores = await db
		.select({
			store: stores,
			url: storeHotSauces.url,
			updatedAt: storeHotSauces.updatedAt
		})
		.from(stores)
		.innerJoin(
			storeHotSauces,
			and(eq(storeHotSauces.storeId, stores.storeId), eq(storeHotSauces.sauceId, sauce.sauceId))
		);

	// querry all reviews for a sauce, that are not flagged or are from the user
	const dbCheckins = await db
		.select({
			username: userTable.username,
			checkins: checkins
		})
		.from(checkins)
		.leftJoin(userTable, eq(checkins.userId, userTable.id))
		.where(
			and(
				eq(checkins.hotSauceId, sauceId),
				eq(checkins.flagged, false),
				user ? not(eq(userTable.id, user.id)) : undefined
			)
		)
		.limit(24);

	if (user) {
		const dbUserCheckinPromise = db
			.select()
			.from(checkins)
			.where(and(eq(checkins.hotSauceId, sauceId), eq(checkins.userId, user.id)));

		const dbWishlistPromise = db
			.select({})
			.from(wishlist)
			.where(and(eq(wishlist.hotSauceId, sauceId), eq(wishlist.userId, user.id)));

		const [userCheckin, dbWishlist] = await Promise.all([dbUserCheckinPromise, dbWishlistPromise]);

		return {
			sauce,
			checkins: dbCheckins,
			stores: dbStores ?? [],
			userCheckin: userCheckin.length > 0 ? userCheckin[0] : null,
			wishlisted: dbWishlist.length > 0
		};
	}

	return {
		sauce,
		checkins: dbCheckins,
		stores: dbStores ?? [],
		userCheckin: null,
		wishlisted: false
	};
}

export const actions = {
	review: async ({ request, locals: { session, user } }) => {
		if (!session || !user) {
			return fail(401, {
				error: 'Unauthorized'
			});
		}

		const data = await request.formData();

		const sauceId = data.get('id') as string | null;
		if (!sauceId) {
			return fail(400, {
				error: 'Invalid sauce'
			});
		}

		const rating = Number(data.get('rating'));
		if (rating < 1 || rating > 5) {
			return fail(400, {
				error: 'Please enter a valid rating'
			});
		}

		const review = String(data.get('content'));

		let flagged = false;
		if (review) {
			// loading this model takes around 4-5 seconds, so only load if needed
			const toxicity = await import('@tensorflow-models/toxicity');
			const model = await toxicity.load(0.9, ['toxicity']);

			const predictions = await model.classify(review);

			for (const prediction of predictions) {
				if (prediction.results[0].match) {
					flagged = true;
					break;
				}
			}
		}

		try {
			await db
				.insert(checkins)
				.values([
					{
						hotSauceId: sauceId,
						review,
						userId: user.id,
						rating,
						flagged
					}
				])
				.onConflictDoUpdate({
					target: [checkins.userId, checkins.hotSauceId],
					set: {
						review,
						rating
					}
				});
		} catch (err) {
			console.error(err);
			return fail(500, {
				error: 'Failed to save review'
			});
		}

		return {};
	},
	wishlist: async ({ request, locals: { session, user } }) => {
		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();

		const sauceId = data.get('id') as string | null;
		if (!sauceId) {
			return fail(400, { error: 'Invalid sauce' });
		}

		const wish = data.get('wishlist');

		if (wish === 'false') {
			try {
				await db
					.delete(wishlist)
					.where(and(eq(wishlist.hotSauceId, sauceId), eq(wishlist.userId, user.id)));
			} catch (err) {
				console.error(err);
				return fail(500, { error: 'Failed to remove from wishlist' });
			}

			return {};
		}

		try {
			await db.insert(wishlist).values([
				{
					hotSauceId: sauceId,
					userId: user.id
				}
			]);
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to add to wishlist' });
		}

		return {};
	},
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

		return {};
	}
};
