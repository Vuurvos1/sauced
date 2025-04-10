import { achievementEnum } from '@app/db/schema';

import { checkinAchievement } from './checkin';
import { reviewAchievement } from './review';
import { daBombAchievement } from './daBomb';
import { lastDabAchievement } from './lastDab';

import FirstBurn from '$lib/assets/achievements/first-burn.svg';
import ScorchedEarth from '$lib/assets/achievements/scorched-earth.svg';
import CapsaicinConnoisseur from '$lib/assets/achievements/capsaicin-connoisseur.svg';
import DaBomb from '$lib/assets/achievements/da-bomb.svg';
import TheLastDab from '$lib/assets/achievements/the-last-dab.svg';

type User = {
	id: string;
};

export type Achievement = {
	id: (typeof achievementEnum.enumValues)[number];
	name: string;
	description: string;
	icon?: string;
	image?: string;
};

export type AchievementChecker = (user: User) => Promise<Achievement[]>;

export const achievements = [
	// Tasting Achievements
	{
		id: 'first-burn',
		name: 'First Burn',
		description: 'Rate your first sauce',
		icon: 'fa-fire',
		image: FirstBurn
	},
	{
		id: 'scorched-earth',
		name: 'Scorched Earth',
		description: 'Rate 50 sauces',
		icon: 'fa-fire-flame-curved',
		image: ScorchedEarth
	},
	{
		id: 'capsaicin-connoisseur',
		name: 'Capsaicin Connoisseur',
		description: 'Rate 100 sauces',
		icon: 'fa-award',
		image: CapsaicinConnoisseur
	},
	// {
	// 	name: 'Global Tongue',
	// 	description: 'Rate sauces from 10 different countries',
	// 	icon: 'fa-globe'
	// },
	// {
	// 	name: 'The Collector',
	// 	description: 'Try sauces from 20 unique brands',
	// 	icon: 'fa-trophy'
	// },

	// Heat Level Achievements
	// {
	// 	name: 'Mild Child',
	// 	description: 'Try 10 mild sauces',
	// 	icon: 'fa-temperature-low'
	// },
	// {
	// 	name: 'Medium Mayhem',
	// 	description: 'Try 10 medium-heat sauces',
	// 	icon: 'fa-temperature-half'
	// },
	// {
	// 	name: 'Hot Shot',
	// 	description: 'Try 10 hot sauces',
	// 	icon: 'fa-temperature-high'
	// },
	// {
	// 	name: 'Pain Seeker',
	// 	description: 'Rate 5 sauces above 1 million Scoville',
	// 	icon: 'fa-skull'
	// },
	// {
	// 	name: 'Lava Lord',
	// 	description: 'Rate the hottest sauce in the app',
	// 	icon: 'fa-volcano'
	// },

	// Social / Community Achievements
	{
		id: 'first-review',
		name: 'First Review',
		description: 'Write your first review',
		icon: 'fa-pen'
	},
	{
		id: 'spice-critic',
		name: 'Spice Critic',
		description: 'Write 10 reviews',
		icon: 'fa-pen-fancy'
	},
	{
		id: 'capsaicin-columnist',
		name: 'Capsaicin Columnist',
		description: 'Write 25 reviews',
		icon: 'fa-pen-nib'
	},
	{
		id: 'hot-take-machine',
		name: 'Hot Take Machine',
		description: 'Write 50 reviews',
		icon: 'fa-pen-to-square'
	},
	{
		id: 'blazing-bard',
		name: 'Blazing Bard',
		description: 'Write 100 reviews',
		icon: 'fa-feather'
	},

	// {
	// 	name: 'Firestarter',
	// 	description: 'Refer a friend to the app',
	// 	icon: 'fa-user-plus'
	// },

	// Fun Achievements
	// {
	// 	name: 'Hot Sauce for Breakfast',
	// 	description: 'Rate a sauce before 9 AM',
	// 	icon: 'fa-sun'
	// },
	// {
	// 	name: 'Double Dip',
	// 	description: 'Re-rate a sauce after 6 months',
	// 	icon: 'fa-rotate'
	// },

	// Hot Sauce Achievements
	{
		id: 'the-last-dab',
		name: 'The Last Dab',
		description: "Rate the 'Last Dab' hot sauce",
		image: TheLastDab
	},
	{
		id: 'da-bomb',
		name: 'Da Bomb',
		description: "Rate the 'Da Bomb' hot sauce",
		image: DaBomb
	}
] as const satisfies Achievement[];

export type AchievementName = (typeof achievements)[number]['name'];
export const achievementMap = new Map<AchievementName, Achievement>(
	achievements.map((a) => [a.name, a])
);

export async function getAchievements(user: User) {
	const results = await Promise.all([
		checkinAchievement(user),
		reviewAchievement(user),
		daBombAchievement(user),
		lastDabAchievement(user)
	]);
	return results.flat();
}
