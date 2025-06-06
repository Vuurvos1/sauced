import { db } from '$lib/db';
import { checkins, hotSauces } from '@app/db/schema';
import { eq, and, count, isNotNull, ne } from 'drizzle-orm';

import { achievementMap, type Achievement, type AchievementChecker } from './';

export const reviewAchievement: AchievementChecker = async (user) => {
	const sauces = await db
		.select({
			count: count()
		})
		.from(checkins)
		.innerJoin(hotSauces, eq(checkins.hotSauceId, hotSauces.sauceId))
		.where(and(eq(checkins.userId, user.id), isNotNull(checkins.review), ne(checkins.review, '')));
	const sauce = sauces[0];

	const achievements: Achievement[] = [];

	if (sauce.count >= 1) {
		achievements.push(achievementMap.get('First Review')!);
	}

	if (sauce.count >= 10) {
		achievements.push(achievementMap.get('Spice Critic')!);
	}

	if (sauce.count >= 25) {
		achievements.push(achievementMap.get('Capsaicin Columnist')!);
	}

	if (sauce.count >= 50) {
		achievements.push(achievementMap.get('Hot Take Machine')!);
	}

	if (sauce.count >= 100) {
		achievements.push(achievementMap.get('Blazing Bard')!);
	}

	return achievements;
};
