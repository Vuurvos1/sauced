-- The old per-store scrapers left sauces with the brand baked into the name and
-- no maker, which the new scraper cannot key back to. Anything nobody has checked
-- in or wishlisted is just rescraped, so drop it (store links cascade). What is
-- left is merged onto its rescraped row by packages/scraper/merge-legacy.js.
DELETE FROM "hot_sauces" s
WHERE NOT EXISTS (SELECT 1 FROM "checkins" c WHERE c."hot_sauce_id" = s."id")
	AND NOT EXISTS (SELECT 1 FROM "wishlist" w WHERE w."hot_sauce_id" = s."id");--> statement-breakpoint
DELETE FROM "makers" m
WHERE NOT EXISTS (SELECT 1 FROM "hot_sauces" s WHERE s."maker_id" = m."maker_id");
