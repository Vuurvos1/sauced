import {
	pgTable,
	integer,
	serial,
	text,
	timestamp,
	varchar,
	primaryKey,
	boolean,
	pgEnum,
	uuid,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const roleEnum = pgEnum('role', ['admin', 'moderator', 'user']);

export const makers = pgTable('makers', {
	makerId: uuid('maker_id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	description: text('description').default(''),
	website: varchar('website', { length: 256 }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const hotSauces = pgTable(
	'hot_sauces',
	{
		sauceId: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull().unique(),
		slug: text('slug').notNull().unique(),
		description: text('description').default(''),
		imageUrl: text('image_url'),
		makerId: uuid('maker_id').references(() => makers.makerId, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('slug_idx').on(table.slug)]
);

export const stores = pgTable('stores', {
	storeId: uuid('store_id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	description: text('description').default(''),
	url: varchar('url', { length: 256 }).notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const storeHotSauces = pgTable(
	'store_hot_sauces',
	{
		sauceId: uuid('hot_sauce_id')
			.notNull()
			.references(() => hotSauces.sauceId, { onDelete: 'cascade' }),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.storeId, { onDelete: 'cascade' }),
		url: varchar('url', { length: 256 }).notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [primaryKey({ columns: [t.storeId, t.sauceId] })]
);

export const events = pgTable('events', {
	eventId: uuid('event_id').primaryKey(),
	name: varchar('name', { length: 256 }).notNull(),
	description: text('description').default(''),
	eventDate: timestamp('event_date').notNull(),
	location: varchar('location', { length: 256 }),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const followers = pgTable(
	'followers',
	{
		followerId: serial('follower_id'),
		followerUserId: text('follower_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		followedUserId: text('followed_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		followedAt: timestamp('followed_at').defaultNow()
	},
	(t) => [primaryKey({ columns: [t.followerUserId, t.followedUserId] })]
);

export const friends = pgTable(
	'friends',
	{
		friendId: serial('friend_id'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		friendUserId: text('friend_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		becameFriendsAt: timestamp('became_friends_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.friendUserId] })]
);

export const wishlist = pgTable(
	'wishlist',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hotSauceId: uuid('hot_sauce_id')
			.notNull()
			.references(() => hotSauces.sauceId, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.hotSauceId] })]
);

export const checkins = pgTable(
	'checkins',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hotSauceId: uuid('hot_sauce_id')
			.notNull()
			.references(() => hotSauces.sauceId, { onDelete: 'cascade' }),
		rating: integer('rating'),
		review: text('review').default(''),
		flagged: boolean('flagged').default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [primaryKey({ columns: [t.userId, t.hotSauceId] })]
);

export const achievementEnum = pgEnum('achievement', [
	'first-burn',
	'scorched-earth',
	'capsaicin-connoisseur',
	'first-review',
	'spice-critic',
	'capsaicin-columnist',
	'hot-take-machine',
	'blazing-bard',
	'the-last-dab',
	'da-bomb'
]);

export const achievements = pgTable(
	'achievements',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		achievementName: achievementEnum('achievement_name').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.achievementName] })]
);
