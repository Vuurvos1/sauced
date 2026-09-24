-- Fold diacritics before matching, so "habanero" finds "Habañero" and
-- "jalapeno" finds "Jalapeño". pg_trgm already ignores case and punctuation,
-- but not accents, and sauce names are full of them. Drizzle does not model
-- extensions or functions, so they are prepended to the generated DDL below.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- unaccent() is only STABLE, since its dictionary is resolved at runtime, and
-- Postgres refuses to index a non-immutable expression. Naming the dictionary
-- explicitly makes the result deterministic; the cost is that changing the
-- dictionary file means REINDEXing the four indexes below.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;--> statement-breakpoint
DROP INDEX "hot_sauces_name_trgm_idx";--> statement-breakpoint
DROP INDEX "hot_sauces_description_trgm_idx";--> statement-breakpoint
DROP INDEX "makers_name_trgm_idx";--> statement-breakpoint
DROP INDEX "stores_name_trgm_idx";--> statement-breakpoint
CREATE INDEX "hot_sauces_name_trgm_idx" ON "hot_sauces" USING gin (immutable_unaccent("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "hot_sauces_description_trgm_idx" ON "hot_sauces" USING gin (immutable_unaccent("description") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "makers_name_trgm_idx" ON "makers" USING gin (immutable_unaccent("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "stores_name_trgm_idx" ON "stores" USING gin (immutable_unaccent("name") gin_trgm_ops);