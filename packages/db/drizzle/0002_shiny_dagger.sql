CREATE TYPE "public"."achievement" AS ENUM('first-burn', 'scorched-earth', 'capsaicin-connoisseur', 'first-review', 'spice-critic', 'capsaicin-columnist', 'hot-take-machine', 'blazing-bard', 'the-last-dab', 'da-bomb');--> statement-breakpoint
CREATE TABLE "achievements" (
	"user_id" uuid NOT NULL,
	"achievement_name" "achievement" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_user_id_achievement_name_pk" PRIMARY KEY("user_id","achievement_name")
);
--> statement-breakpoint
ALTER TABLE "hot_sauces" ALTER COLUMN "slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;