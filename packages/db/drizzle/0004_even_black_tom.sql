-- pg_trgm backs both the `ilike '%query%'` filters and the fuzzy `<%` matching
-- in the search queries. Drizzle does not model extensions, so it is created here.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "hot_sauces_name_trgm_idx" ON "hot_sauces" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "hot_sauces_description_trgm_idx" ON "hot_sauces" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "makers_name_trgm_idx" ON "makers" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "stores_name_trgm_idx" ON "stores" USING gin ("name" gin_trgm_ops);
