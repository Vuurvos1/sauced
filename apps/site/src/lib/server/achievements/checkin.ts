import { db } from '$lib/db';
import { checkins, hotSauces } from '@app/db/schema';
import { eq, count } from 'drizzle-orm';

import { achievementMap, type Achievement, type AchievementChecker } from './';

export const checkinAchievement: AchievementChecker = async (user) => {
	// check if user has sauce named  Da Bomb Beyond Insanity
	const sauces = await db
		.select({
			count: count()
		})
		.from(checkins)
		.innerJoin(hotSauces, eq(checkins.hotSauceId, hotSauces.sauceId))
		.where(eq(checkins.userId, user.id));
	const sauce = sauces[0];

	const achievements: Achievement[] = [];

	if (sauce.count >= 1) {
		achievements.push(achievementMap.get('First Burn')!);
	}

	if (sauce.count >= 50) {
		achievements.push(achievementMap.get('Scorched Earth')!);
	}

	if (sauce.count >= 100) {
		achievements.push(achievementMap.get('Capsaicin Connoisseur')!);
	}

	return achievements;
};
