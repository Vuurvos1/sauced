import { form, getRequestEvent, query } from '$app/server';
import { reviewSchema } from '$lib/validation';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { checkins } from '@app/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

// TODO: fix tensorflow issues
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as tf from '@tensorflow/tfjs';

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

	let flagged = false;
	if (content) {
		// loading this model takes around 4-5 seconds, so only load if needed
		const toxicity = await import('@tensorflow-models/toxicity');
		const model = await toxicity.load(0.9, ['toxicity']);

		const predictions = await model.classify(content);

		for (const prediction of predictions) {
			if (prediction.results[0].match) {
				flagged = true;
				break;
			}
		}
	}

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
