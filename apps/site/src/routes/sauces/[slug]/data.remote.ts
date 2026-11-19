import { form, getRequestEvent, query } from '$app/server';
import { reviewSchema } from '#lib/validation/index.js';
import { z } from 'zod/v4';
import { db } from '#lib/server/db.js';
import { checkins } from '@app/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

import { isFlagged } from '#lib/server/moderation.js';

export const getUserCheckin = query(z.uuid(), async (sauceId) => {
	const {
		locals: { user }
	} = getRequestEvent();
	if (!user) return null;

	const [checkin] = await db
		.select()
		.from(checkins)
		.where(and(eq(checkins.hotSauceId, sauceId), eq(checkins.userId, user.id)));
	return checkin ?? null;
});

export const upsertReview = form(reviewSchema, async ({ id, rating, content }) => {
	const {
		locals: { user }
	} = getRequestEvent();
	if (!user) error(401, 'Unauthorized');

	// Unchanged text keeps its verdict: changing only the rating shouldn't pay for
	// another moderation call.
	const [previous] = await db
		.select({ review: checkins.review, flagged: checkins.flagged })
		.from(checkins)
		.where(and(eq(checkins.hotSauceId, id), eq(checkins.userId, user.id)))
		.limit(1);
	const flagged = !content
		? false
		: previous && previous.review === content
			? Boolean(previous.flagged)
			: await isFlagged(content);

	await db
		.insert(checkins)
		.values([
			{
				hotSauceId: id,
				review: content,
				userId: user.id,
				rating,
				flagged
			}
		])
		.onConflictDoUpdate({
			target: [checkins.userId, checkins.hotSauceId],
			set: {
				review: content,
				rating,
				flagged
			}
		});

	await getUserCheckin(id).refresh();
});

export const removeCheckin = form(z.object({ id: z.uuid() }), async ({ id }) => {
	const {
		locals: { user }
	} = getRequestEvent();
	if (!user) error(401, 'Unauthorized');

	await db.delete(checkins).where(and(eq(checkins.hotSauceId, id), eq(checkins.userId, user.id)));

	await getUserCheckin(id).refresh();
});
