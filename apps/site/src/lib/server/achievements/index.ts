type User = {
	id: string;
};

export type Achievement = {
	name: string;
	description: string;
	icon: string;
	// condition: (user: User) => boolean;
};

export type AchievementChecker = (user: User) => Promise<Achievement[]>;

export const achievements = [
	// Tasting Achievements
	{
		name: 'First Burn',
		description: 'Rate your first sauce',
		icon: 'fa-fire'
	},
	{
		name: 'Scorched Earth',
		description: 'Rate 50 sauces',
		icon: 'fa-fire-flame-curved'
	},
	{
		name: 'Capsaicin Connoisseur',
		description: 'Rate 100 sauces',
		icon: 'fa-award'
	},
	{
		name: 'Global Tongue',
		description: 'Rate sauces from 10 different countries',
		icon: 'fa-globe'
	},
	{
		name: 'The Collector',
		description: 'Try sauces from 20 unique brands',
		icon: 'fa-trophy'
	},

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
		name: 'First Review',
		description: 'Write your first review',
		icon: 'fa-pen'
	},
	{
		name: 'Spice Critic',
		description: 'Write 10 reviews',
		icon: 'fa-pen-fancy'
	},
	{
		name: 'Capsaicin Columnist',
		description: 'Write 25 reviews',
		icon: 'fa-pen-nib'
	},
	{
		name: 'Hot Take Machine',
		description: 'Write 50 reviews',
		icon: 'fa-pen-to-square'
	},
	{
		name: 'Blazing Bard',
		description: 'Write 100 reviews',
		icon: 'fa-feather'
	},

	{
		name: 'Firestarter',
		description: 'Refer a friend to the app',
		icon: 'fa-user-plus'
	},

	// Fun / Whimsical Achievements
	{
		name: 'Hot Sauce for Breakfast',
		description: 'Rate a sauce before 9 AM',
		icon: 'fa-sun'
	},
	{
		name: 'Tears of Joy',
		description: 'Post a photo with watery eyes',
		icon: 'fa-face-sad-tear'
	},
	{
		name: 'Double Dip',
		description: 'Re-rate a sauce after 6 months',
		icon: 'fa-rotate'
	},
	//
	{
		name: 'The Last Dab',
		description: "Rate a sauce in the 'Last Dab' category",
		icon: 'fa-dab'
	},
	{
		name: 'Da Bomb',
		description: "Rate a sauce in the 'Da Bomb' category",
		icon: 'fa-bomb'
	}
] as const satisfies Achievement[];

export type AchievementName = (typeof achievements)[number]['name'];
export const achievementMap = new Map<AchievementName, Achievement>(
	achievements.map((a) => [a.name, a])
);
