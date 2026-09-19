CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "achievements_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "checkins" DROP CONSTRAINT IF EXISTS "checkins_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "followers" DROP CONSTRAINT IF EXISTS "followers_follower_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "followers" DROP CONSTRAINT IF EXISTS "followers_followed_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "friends" DROP CONSTRAINT IF EXISTS "friends_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "friends" DROP CONSTRAINT IF EXISTS "friends_friend_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "wishlist_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "email_verification" DROP CONSTRAINT IF EXISTS "email_verification_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "password_reset_token" DROP CONSTRAINT IF EXISTS "password_reset_token_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "oauth_account" DROP CONSTRAINT IF EXISTS "oauth_account_user_id_user_id_fk";--> statement-breakpoint

-- Better Auth issues its own session tokens and the new session columns below are
-- NOT NULL with no default, so existing rows cannot be translated. Everyone signs
-- in again once after this deploys.
DELETE FROM "session";--> statement-breakpoint

-- Add the new user columns nullable first so existing rows survive, then backfill
-- from the columns we are about to drop, then tighten to NOT NULL.
ALTER TABLE "user" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "user" SET "name" = "username" WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "user" SET "email_verified" = "is_email_verified";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "achievements" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "checkins" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "follower_user_id" SET DATA TYPE text USING "follower_user_id"::text;--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "followed_user_id" SET DATA TYPE text USING "followed_user_id"::text;--> statement-breakpoint
ALTER TABLE "friends" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "friends" ALTER COLUMN "friend_user_id" SET DATA TYPE text USING "friend_user_id"::text;--> statement-breakpoint
ALTER TABLE "wishlist" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
-- Move credentials into "account" while the legacy tables still exist.
-- NOTE: these hashes are argon2 (@node-rs/argon2) and Better Auth's default hasher
-- is scrypt, so they will not verify. The row is carried over so the account is
-- recognised and "forgot password" works; affected users reset once, unless a
-- custom password verifier is configured in lib/server/auth.ts.
INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
SELECT gen_random_uuid()::text, u."id", 'credential', u."id", u."password_hash", now(), now()
FROM "user" u
WHERE u."password_hash" IS NOT NULL;--> statement-breakpoint
INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text, o."provider_user_id", o."provider", o."user_id"::text, o."created_at", now()
FROM "oauth_account" o;--> statement-breakpoint
ALTER TABLE "email_verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "email_verification" CASCADE;--> statement-breakpoint
DROP TABLE "oauth_account" CASCADE;--> statement-breakpoint
DROP TABLE "password_reset_token" CASCADE;--> statement-breakpoint

-- "session" was emptied above, so NOT NULL without a default is safe here.
ALTER TABLE "session" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updated_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "is_email_verified";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "auth_methods";--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_followed_user_id_user_id_fk" FOREIGN KEY ("followed_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_user_id_user_id_fk" FOREIGN KEY ("friend_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
