import { db } from '$lib/server/db';
import { checkins, hotSauces } from '@app/db/schema';
import { eq, like, and } from 'drizzle-orm';

import { achievementMap, type AchievementChecker } from './';

export const daBombAchievement: AchievementChecker = async (user) => {
	// check if user has sauce named  Da Bomb Beyond Insanity
	const sauce = await db
		.select({
			sauceName: hotSauces.name
		})
		.from(checkins)
		.innerJoin(hotSauces, eq(checkins.hotSauceId, hotSauces.sauceId))
		.where(and(eq(checkins.userId, user.id), like(hotSauces.name, '%The Last Dab%')))
		.limit(1);

	if (sauce.length === 0) {
		return [];
	}

	return [achievementMap.get('The Last Dab')!];
};
