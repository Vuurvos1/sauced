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

export const roleEnum = pgEnum('role', ['admin', 'moderator', 'user']);

// auth
export const userTable = pgTable('user', {
	id: uuid('id').defaultRandom().primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash'),
	role: roleEnum('role').notNull().default('user'),

	email: text('email').notNull().unique(),
	emailVerified: boolean('is_email_verified').notNull().default(false),
	authMethods: text('auth_methods').array().notNull().default([]),

	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const oauthAccountTable = pgTable(
	'oauth_account',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		providerId: text('provider').notNull(),
		providerUserId: text('provider_user_id').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.providerId] })]
);

export const emailVerificationTable = pgTable('email_verification', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	token: text('token').notNull(),
	expiresAt: timestamp('expires_at').notNull()
});

export const passwordResetTokenTable = pgTable('password_reset_token', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => userTable.id),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: timestamp('expires_at').notNull()
});

export const sessionTable = pgTable('session', {
	id: text('id').primaryKey().notNull(), // TODO: change to uuid?
	userId: uuid('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull()
});

// app
export const makers = pgTable('makers', {
	makerId: uuid('maker_id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	description: text('description').default(''),
	website: varchar('website', { length: 256 }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		// TODO: maybe replace these with sql`now()`?
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
		}), // TODO: a sauce can have multiple makers
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
	// TODO: add country/loccation?
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
		followerUserId: uuid('follower_user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		followedUserId: uuid('followed_user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		followedAt: timestamp('followed_at').defaultNow()
	},
	(t) => [primaryKey({ columns: [t.followerUserId, t.followedUserId] })]
);

export const friends = pgTable(
	'friends',
	{
		friendId: serial('friend_id'),
		userId: uuid('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		friendUserId: uuid('friend_user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		becameFriendsAt: timestamp('became_friends_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.friendUserId] })]
);

export const wishlist = pgTable(
	'wishlist',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
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
		userId: uuid('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		hotSauceId: uuid('hot_sauce_id')
			.notNull()
			.references(() => hotSauces.sauceId, { onDelete: 'cascade' }), // TODO: change to uuid?
		rating: integer('rating'), // TODO: turn into a float?
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
		userId: uuid('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),
		achievementName: achievementEnum('achievement_name').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.achievementName] })]
);
