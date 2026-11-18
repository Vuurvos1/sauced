import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { hotSauceImages, hotSauces, makers } from '@app/db/schema';
import { db } from '#lib/server/db.js';
import { contentHash, IMAGE_WIDTHS, imageBucket, requireAdmin } from '#lib/server/admin.js';
import { loadSauceEditor } from '#lib/server/sauce-editor.js';
import { clearCache } from '#lib/server/cache.js';
import { visibleImage } from '#lib/server/images.js';

async function findSauce(slug: string) {
	const [sauce] = await db
		.select({
			sauceId: hotSauces.sauceId,
			name: hotSauces.name,
			slug: hotSauces.slug,
			description: hotSauces.description,
			reviewedAt: hotSauces.reviewedAt,
			hiddenAt: hotSauces.hiddenAt,
			createdAt: hotSauces.createdAt,
			makerName: makers.name
		})
		.from(hotSauces)
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
		.where(eq(hotSauces.slug, slug))
		.limit(1);
	if (!sauce) error(404, 'Sauce not found');
	return sauce;
}

/**
 * The unreviewed sauce after this one in the review list's order (newest first),
 * wrapping round to the start.
 */
async function nextToReview(sauce: { sauceId: string; createdAt: Date }) {
	const after = or(
		lt(hotSauces.createdAt, sauce.createdAt),
		and(eq(hotSauces.createdAt, sauce.createdAt), sql`${hotSauces.sauceId} > ${sauce.sauceId}`)
	);
	const toReview = and(isNull(hotSauces.reviewedAt), isNull(hotSauces.hiddenAt));
	for (const where of [and(toReview, after), toReview]) {
		const [next] = await db
			.select({ slug: hotSauces.slug })
			.from(hotSauces)
			.where(and(where, sql`${hotSauces.sauceId} <> ${sauce.sauceId}`))
			.orderBy(desc(hotSauces.createdAt), hotSauces.sauceId)
			.limit(1);
		if (next) return next.slug;
	}
	return null;
}

export async function load({ locals, params }) {
	requireAdmin(locals);
	const sauce = await findSauce(params.slug);
	const [editor, next] = await Promise.all([loadSauceEditor(sauce.sauceId), nextToReview(sauce)]);
	return { sauce, next, ...editor };
}

/**
 * After a sauce is dealt with: stay put when asked to (the editor on the public
 * sauce page), otherwise move on to the next sauce to review.
 */
async function moveOn(formData: FormData, sauce: Awaited<ReturnType<typeof findSauce>>) {
	if (formData.has('stay')) return { ok: true };
	const next = await nextToReview(sauce);
	redirect(303, next ? `/admin/sauces/${next}` : '/admin/review');
}

const imageForm = z.object({ imageId: z.uuid() });

/** Applies `change` to one of this sauce's photos, from a form naming its id. */
async function updateImage(
	request: Request,
	slug: string,
	change: Partial<typeof hotSauceImages.$inferInsert>
) {
	const parsed = imageForm.safeParse(Object.fromEntries(await request.formData()));
	if (!parsed.success) return fail(400, { error: 'Unknown photo' });
	const sauce = await findSauce(slug);
	await db
		.update(hotSauceImages)
		.set(change)
		.where(
			and(
				eq(hotSauceImages.imageId, parsed.data.imageId),
				eq(hotSauceImages.sauceId, sauce.sauceId)
			)
		);
	return { ok: true };
}

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

/**
 * Every action changes what visitors see, so public caches start over afterwards
 * (on this server instance; others catch up within their TTL).
 */
function clearingCache<T extends Record<string, (event: never) => unknown>>(actions: T): T {
	return Object.fromEntries(
		Object.entries(actions).map(([name, action]) => [
			name,
			async (event: never) => {
				try {
					return await action(event);
				} finally {
					clearCache();
				}
			}
		])
	) as T;
}

export const actions = clearingCache({
	pin: async ({ locals, params, request }) => {
		requireAdmin(locals);
		const parsed = imageForm.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'Unknown photo' });
		const sauce = await findSauce(params.slug);
		// One main image per sauce.
		await db.transaction(async (tx) => {
			await tx
				.update(hotSauceImages)
				.set({ pinned: false })
				.where(eq(hotSauceImages.sauceId, sauce.sauceId));
			await tx
				.update(hotSauceImages)
				.set({ pinned: true, hidden: false, pending: false })
				.where(
					and(
						eq(hotSauceImages.imageId, parsed.data.imageId),
						eq(hotSauceImages.sauceId, sauce.sauceId)
					)
				);
		});
		return { ok: true };
	},
	unpin: async ({ locals, params, request }) => {
		requireAdmin(locals);
		return updateImage(request, params.slug, { pinned: false });
	},
	hide: async ({ locals, params, request }) => {
		requireAdmin(locals);
		const parsed = imageForm.safeParse(Object.fromEntries(await request.clone().formData()));
		if (!parsed.success) return fail(400, { error: 'Unknown photo' });
		const sauce = await findSauce(params.slug);

		// A sauce keeps at least one photo; one with none to show should be hidden itself.
		// Rejecting a pending photo is fine: visitors never saw it.
		const visible = await db
			.select({ imageId: hotSauceImages.imageId })
			.from(hotSauceImages)
			.where(and(eq(hotSauceImages.sauceId, sauce.sauceId), visibleImage));
		const hidingVisible = visible.some((image) => image.imageId === parsed.data.imageId);
		if (hidingVisible && visible.length <= 1) {
			return fail(400, { error: 'This is the only photo; hide the sauce instead' });
		}

		return updateImage(request, params.slug, { hidden: true, pinned: false, pending: false });
	},
	show: async ({ locals, params, request }) => {
		requireAdmin(locals);
		return updateImage(request, params.slug, { hidden: false, pending: false });
	},

	details: async ({ locals, params, request }) => {
		requireAdmin(locals);
		const parsed = z
			.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(5000) })
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: 'A name is required' });
		const sauce = await findSauce(params.slug);
		try {
			await db.update(hotSauces).set(parsed.data).where(eq(hotSauces.sauceId, sauce.sauceId));
		} catch {
			// hot_sauces_maker_name_unique: the maker already has a sauce by that name.
			return fail(400, { error: 'This maker already has a sauce with that name' });
		}
		return { ok: true };
	},

	review: async ({ locals, params, request }) => {
		requireAdmin(locals);
		const sauce = await findSauce(params.slug);
		await db
			.update(hotSauces)
			.set({ reviewedAt: new Date() })
			.where(eq(hotSauces.sauceId, sauce.sauceId));
		return moveOn(await request.formData(), sauce);
	},
	hideSauce: async ({ locals, params, request }) => {
		requireAdmin(locals);
		const sauce = await findSauce(params.slug);
		await db
			.update(hotSauces)
			.set({ hiddenAt: new Date() })
			.where(eq(hotSauces.sauceId, sauce.sauceId));
		return moveOn(await request.formData(), sauce);
	},
	showSauce: async ({ locals, params }) => {
		requireAdmin(locals);
		const sauce = await findSauce(params.slug);
		await db.update(hotSauces).set({ hiddenAt: null }).where(eq(hotSauces.sauceId, sauce.sauceId));
		return { ok: true };
	},
	unreview: async ({ locals, params }) => {
		requireAdmin(locals);
		const sauce = await findSauce(params.slug);
		await db
			.update(hotSauces)
			.set({ reviewedAt: null })
			.where(eq(hotSauces.sauceId, sauce.sauceId));
		return { ok: true };
	},

	/** Stores the boxes and the copies the browser rendered with them. */
	edit: async ({ locals, params, request }) => {
		requireAdmin(locals);
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

		const sauce = await findSauce(params.slug);
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
		const key = `sauces/v1/edits/${(await contentHash(bodies.at(-1)!)).slice(0, 32)}`;
		await Promise.all(
			IMAGE_WIDTHS.map((width, i) => bucket.put(`${key}-${width}.webp`, bodies[i]))
		);

		await db
			.update(hotSauceImages)
			.set({ edits: { masks: parsedMasks.data }, editedKey: key })
			.where(eq(hotSauceImages.imageId, image.imageId));
		return { ok: true };
	},
	unedit: async ({ locals, params, request }) => {
		requireAdmin(locals);
		// The edited files stay in the bucket; nothing points at them any more.
		return updateImage(request, params.slug, { edits: null, editedKey: null });
	}
});
