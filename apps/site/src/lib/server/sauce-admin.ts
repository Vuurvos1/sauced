import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { hotSauceImages, hotSauces } from '@app/db/schema';
import { IMAGE_KEY_PREFIX, IMAGE_WIDTHS, imageObjectName } from '@app/db/images';
import { db } from '#lib/server/db.js';
import { contentHash, imageBucket, requireAdmin } from '#lib/server/admin.js';
import { forget, HOME_CACHE_KEY } from '#lib/server/cache.js';
import { visibleImage } from '#lib/server/images.js';
import { nextToReview } from '#lib/server/sauce-editor.js';

/**
 * The admin's editing actions, served by the sauce page itself so its forms post
 * to the page they're on. Each one checks the admin first.
 */

type Event = RequestEvent<{ slug: string }>;

async function findSauce(slug: string) {
	const [sauce] = await db
		.select({ sauceId: hotSauces.sauceId, createdAt: hotSauces.createdAt })
		.from(hotSauces)
		.where(eq(hotSauces.slug, slug))
		.limit(1);
	if (!sauce) error(404, 'Sauce not found');
	return sauce;
}

/** The sauce and the photo a form names, or why not. */
async function photoForm({ params, request }: Event) {
	const parsed = z.uuid().safeParse((await request.formData()).get('imageId'));
	if (!parsed.success) return null;
	return { sauce: await findSauce(params.slug), imageId: parsed.data };
}

async function updatePhoto(
	sauceId: string,
	imageId: string,
	change: Partial<typeof hotSauceImages.$inferInsert>
) {
	await db
		.update(hotSauceImages)
		.set(change)
		.where(and(eq(hotSauceImages.imageId, imageId), eq(hotSauceImages.sauceId, sauceId)));
}

/** A photo action: admin check, form parsing and cache invalidation in one place. */
function photoAction(
	act: (sauceId: string, imageId: string) => Promise<ReturnType<typeof fail> | void>
) {
	return async (event: Event) => {
		await requireAdmin(event.locals);
		const form = await photoForm(event);
		if (!form) return fail(400, { error: 'Unknown photo' });
		const failure = await act(form.sauce.sauceId, form.imageId);
		forget(HOME_CACHE_KEY);
		return failure ?? { ok: true };
	};
}

/** A sauce action: admin check and cache invalidation. */
function sauceAction(act: (sauce: Awaited<ReturnType<typeof findSauce>>, event: Event) => unknown) {
	return async (event: Event) => {
		await requireAdmin(event.locals);
		const result = await act(await findSauce(event.params.slug), event);
		forget(HOME_CACHE_KEY);
		return result ?? { ok: true };
	};
}

const setSauce = (sauceId: string, change: Partial<typeof hotSauces.$inferInsert>) =>
	db.update(hotSauces).set(change).where(eq(hotSauces.sauceId, sauceId));

const masks = z
	.array(
		z.object({
			x: z.number().min(0).max(1),
			y: z.number().min(0).max(1),
			width: z.number().gt(0).max(1),
			height: z.number().gt(0).max(1)
		})
	)
	.min(1)
	.max(50);

const MAX_UPLOAD_BYTES = 2_000_000;

export const sauceAdminActions = {
	pin: photoAction(async (sauceId, imageId) => {
		// One main image per sauce.
		await db.transaction(async (tx) => {
			await tx
				.update(hotSauceImages)
				.set({ pinned: false })
				.where(eq(hotSauceImages.sauceId, sauceId));
			await tx
				.update(hotSauceImages)
				.set({ pinned: true, hidden: false, pending: false })
				.where(and(eq(hotSauceImages.imageId, imageId), eq(hotSauceImages.sauceId, sauceId)));
		});
	}),
	unpin: photoAction((sauceId, imageId) => updatePhoto(sauceId, imageId, { pinned: false })),
	hide: photoAction(async (sauceId, imageId) => {
		// A sauce keeps at least one photo; one with none to show should be hidden itself.
		// Rejecting a pending photo is fine: visitors never saw it.
		const visible = await db
			.select({ imageId: hotSauceImages.imageId })
			.from(hotSauceImages)
			.where(and(eq(hotSauceImages.sauceId, sauceId), visibleImage));
		if (visible.length <= 1 && visible.some((image) => image.imageId === imageId)) {
			return fail(400, { error: 'This is the only photo; hide the sauce instead' });
		}
		await updatePhoto(sauceId, imageId, { hidden: true, pinned: false, pending: false });
	}),
	show: photoAction((sauceId, imageId) =>
		updatePhoto(sauceId, imageId, { hidden: false, pending: false })
	),
	// The edited files stay in the bucket; nothing points at them any more.
	unedit: photoAction((sauceId, imageId) =>
		updatePhoto(sauceId, imageId, { edits: null, editedKey: null })
	),

	details: sauceAction(async (sauce, { request }) => {
		const parsed = z
			.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(5000) })
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'A name is required' });
		try {
			await setSauce(sauce.sauceId, parsed.data);
		} catch {
			// hot_sauces_maker_name_unique: the maker already has a sauce by that name.
			return fail(400, { error: 'This maker already has a sauce with that name' });
		}
	}),
	/** Locks the sauce and moves on to the next one to review. */
	review: sauceAction(async (sauce) => {
		await setSauce(sauce.sauceId, { reviewedAt: new Date() });
		const next = await nextToReview(sauce);
		redirect(303, next ? `/sauces/${encodeURIComponent(next)}?edit=1` : '/admin/review');
	}),
	unreview: sauceAction((sauce) => setSauce(sauce.sauceId, { reviewedAt: null })),
	hideSauce: sauceAction((sauce) => setSauce(sauce.sauceId, { hiddenAt: new Date() })),
	showSauce: sauceAction((sauce) => setSauce(sauce.sauceId, { hiddenAt: null })),

	/** Stores the boxes and the copies the browser rendered with them. */
	edit: sauceAction(async (sauce, { request }) => {
		const bucket = imageBucket();
		if (!bucket) return fail(503, { error: 'No bucket configured for edits' });

		const formData = await request.formData();
		const imageId = z.uuid().safeParse(formData.get('imageId'));
		let parsedMasks;
		try {
			parsedMasks = masks.safeParse(JSON.parse(String(formData.get('masks'))));
		} catch {
			parsedMasks = null;
		}
		const files = IMAGE_WIDTHS.map((width) => formData.get(`w${width}`));
		if (!imageId.success || !parsedMasks?.success) return fail(400, { error: 'Invalid edit' });
		if (
			!files.every(
				(file): file is File =>
					file instanceof File && file.type === 'image/webp' && file.size <= MAX_UPLOAD_BYTES
			)
		) {
			return fail(400, { error: 'Expected a WebP copy of each size' });
		}

		const [image] = await db
			.select({ imageId: hotSauceImages.imageId })
			.from(hotSauceImages)
			.where(
				and(eq(hotSauceImages.imageId, imageId.data), eq(hotSauceImages.sauceId, sauce.sauceId))
			)
			.limit(1);
		if (!image) return fail(404, { error: 'Unknown photo' });

		const bodies = await Promise.all(files.map((file) => file.arrayBuffer()));
		// Named by content like every other copy, so it can be cached for good.
		const key = `${IMAGE_KEY_PREFIX}/edits/${(await contentHash(bodies.at(-1)!)).slice(0, 32)}`;
		await Promise.all(
			IMAGE_WIDTHS.map((width, i) => bucket.put(imageObjectName(key, width), bodies[i]))
		);

		await db
			.update(hotSauceImages)
			.set({ edits: { masks: parsedMasks.data }, editedKey: key })
			.where(eq(hotSauceImages.imageId, image.imageId));
	})
};
