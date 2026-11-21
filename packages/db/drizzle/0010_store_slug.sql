-- Store pages were keyed on the raw name, which breaks for names with spaces,
-- `&` or `/`. Backfill from the name before the NOT NULL lands.
ALTER TABLE "stores" ADD COLUMN "slug" text;--> statement-breakpoint
-- Mirrors slugifyName(): fold accents, drop anything not alphanumeric, hyphenate.
UPDATE "stores" SET "slug" = regexp_replace(
	trim(both ' ' from lower(regexp_replace(immutable_unaccent("name"), '[^a-zA-Z0-9 ]', '', 'g'))),
	' +', '-', 'g'
);--> statement-breakpoint
-- Two stores can reduce to the same slug; keep the oldest unsuffixed.
UPDATE "stores" s SET "slug" = s."slug" || '-' || d.n
FROM (
	SELECT "store_id", row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "store_id") AS n
	FROM "stores"
) d
WHERE d."store_id" = s."store_id" AND d.n > 1;--> statement-breakpoint
-- A name of only punctuation would leave an empty slug.
UPDATE "stores" SET "slug" = 'store-' || left("store_id"::text, 8) WHERE "slug" = '' OR "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_slug_unique" UNIQUE("slug");
