-- Makers need a URL of their own for /makers/[slug]. Backfill from the name
-- before the NOT NULL lands, since the table is already populated.
ALTER TABLE "makers" ADD COLUMN "slug" text;--> statement-breakpoint
-- Mirrors slugifyName(): fold accents, drop anything not alphanumeric, hyphenate.
UPDATE "makers" SET "slug" = regexp_replace(
	trim(both ' ' from lower(regexp_replace(immutable_unaccent("name"), '[^a-zA-Z0-9 ]', '', 'g'))),
	' +', '-', 'g'
);--> statement-breakpoint
-- Two brands can reduce to the same slug; keep the oldest unsuffixed.
UPDATE "makers" m SET "slug" = m."slug" || '-' || d.n
FROM (
	SELECT "maker_id", row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "maker_id") AS n
	FROM "makers"
) d
WHERE d."maker_id" = m."maker_id" AND d.n > 1;--> statement-breakpoint
-- A name of only punctuation would leave an empty slug.
UPDATE "makers" SET "slug" = 'maker-' || left("maker_id"::text, 8) WHERE "slug" = '' OR "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "makers" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "makers" ADD CONSTRAINT "makers_slug_unique" UNIQUE("slug");
