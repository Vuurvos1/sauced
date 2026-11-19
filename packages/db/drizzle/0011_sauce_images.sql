CREATE TABLE "hot_sauce_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hot_sauce_id" uuid NOT NULL,
	"store_id" uuid,
	"source_url" text NOT NULL,
	"image_key" text,
	"phash" text,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hot_sauce_images_sauce_source_unique" UNIQUE("hot_sauce_id","source_url")
);
--> statement-breakpoint
ALTER TABLE "hot_sauce_images" ADD CONSTRAINT "hot_sauce_images_hot_sauce_id_hot_sauces_id_fk" FOREIGN KEY ("hot_sauce_id") REFERENCES "public"."hot_sauces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hot_sauce_images" ADD CONSTRAINT "hot_sauce_images_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hot_sauce_images_sauce_position_idx" ON "hot_sauce_images" USING btree ("hot_sauce_id","position");--> statement-breakpoint
-- Carry each sauce's one image over as its main image. The shop is recorded only
-- when a single shop stocks the sauce; otherwise the scraper works it out from the
-- image's URL on its next run.
INSERT INTO "hot_sauce_images" ("hot_sauce_id", "store_id", "source_url", "position")
SELECT h."id",
	(SELECT min(l."store_id"::text)::uuid FROM "store_hot_sauces" l
		WHERE l."hot_sauce_id" = h."id" HAVING count(*) = 1),
	h."image_url",
	0
FROM "hot_sauces" h
WHERE h."image_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "hot_sauces" DROP COLUMN "image_url";
