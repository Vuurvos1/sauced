import { db } from '#lib/server/db.js';
import {
	checkins,
	hotSauceImages,
	hotSauces,
	user as userTable,
	wishlist,
	stores,
	storeHotSauces,
	makers
} from '@app/db/schema';
import { error, fail } from '@sveltejs/kit';
import { and, eq, not } from 'drizzle-orm';
import { z } from 'zod/v4';
import { PUBLIC_IMAGE_BASE_URL } from '$app/env/public';
import { imageOrder, withoutDuplicatePhotos } from '#lib/server/images.js';

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

	// Null for a sauce only ever seen at a retailer whose feed names no brand.
	const makerQuery = sauce.makerId
		? db
				.select({ name: makers.name, slug: makers.slug })
				.from(makers)
				.where(eq(makers.makerId, sauce.makerId))
				.limit(1)
		: [];

	const storesQuery = db
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
	const checkinsQuery = db
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

	// Same order as the main image, so the gallery opens on the photo the grid shows.
	const imagesQuery = db
		.select({
			imageKey: hotSauceImages.imageKey,
			imageUrl: hotSauceImages.sourceUrl,
			phash: hotSauceImages.phash
		})
		.from(hotSauceImages)
		.where(eq(hotSauceImages.sauceId, sauceId))
		.orderBy(...imageOrder);

	const wishlistQuery = user
		? db
				.select({})
				.from(wishlist)
				.where(and(eq(wishlist.hotSauceId, sauceId), eq(wishlist.userId, user.id)))
		: [];

	const [dbMaker, dbStores, dbCheckins, dbWishlist, dbImages] = await Promise.all([
		makerQuery,
		storesQuery,
		checkinsQuery,
		wishlistQuery,
		imagesQuery
	]);

	// With a bucket configured, a photo that never uploaded is usually a dead link.
	const images = withoutDuplicatePhotos(
		PUBLIC_IMAGE_BASE_URL ? dbImages.filter((image) => image.imageKey) : dbImages
	).map(({ imageKey, imageUrl }) => ({ imageKey, imageUrl }));

	return {
		sauce,
		images,
		maker: dbMaker.length > 0 ? dbMaker[0] : null,
		checkins: dbCheckins,
		stores: dbStores,
		wishlisted: dbWishlist.length > 0
	};
}

export const actions = {
	wishlist: async ({ request, locals: { session, user } }) => {
		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();

		const parsedId = z.uuid().safeParse(data.get('id'));
		if (!parsedId.success) {
			return fail(400, { error: 'Invalid sauce' });
		}
		const sauceId = parsedId.data;

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
	}
};
