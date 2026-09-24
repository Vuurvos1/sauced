/**
 * One-off: folds sauces written by the old per-store scrapers onto the rows the
 * new scraper created for the same product, moving check-ins and wishlists over.
 *
 * Run it after migration 0009 and a full `scrape all --dbInsert`. By then every
 * surviving legacy sauce has user data and every rescraped one has none, so a
 * pair is: same store, same product handle (the last URL segment — hosts and
 * path prefixes changed between scrapers, handles did not), one side with user
 * data and the other without.
 *
 * Dry run by default; `--apply` writes. The legacy slug moves onto the new row,
 * so the URLs people already shared keep working.
 */
import parser from 'yargs-parser';
import { getDb } from '@app/db';
import { sql } from 'drizzle-orm';

import 'dotenv/config';

const flags = parser(process.argv.slice(2), { boolean: ['apply'] });
const db = getDb(process.env.DATABASE_URL);

/** @type {{ legacy_id: string, legacy_name: string, legacy_slug: string, store: string, handle: string, matches: { id: string, name: string, slug: string }[] }[]} */
const pairs = await db.execute(sql`
		WITH used AS (
			SELECT hot_sauce_id AS id FROM checkins
			UNION
			SELECT hot_sauce_id FROM wishlist
		),
		links AS (
			SELECT
				l.hot_sauce_id AS sauce_id,
				l.store_id,
				lower(substring(split_part(split_part(l.url, '?', 1), '#', 1) FROM '([^/]+)/*$')) AS handle
			FROM store_hot_sauces l
		)
		SELECT
			old.id AS legacy_id,
			old.name AS legacy_name,
			old.slug AS legacy_slug,
			st.name AS store,
			ol.handle,
			coalesce(
				json_agg(json_build_object('id', new.id, 'name', new.name, 'slug', new.slug))
					FILTER (WHERE new.id IS NOT NULL),
				'[]'
			) AS matches
		FROM hot_sauces old
		JOIN used ON used.id = old.id
		JOIN links ol ON ol.sauce_id = old.id
		JOIN stores st ON st.store_id = ol.store_id
		LEFT JOIN links nl
			ON nl.store_id = ol.store_id AND nl.handle = ol.handle AND nl.sauce_id <> old.id
		LEFT JOIN hot_sauces new
			ON new.id = nl.sauce_id AND NOT EXISTS (SELECT 1 FROM used u WHERE u.id = new.id)
		GROUP BY old.id, st.name, ol.handle
		ORDER BY st.name, old.name
	`);

/** A legacy sauce can be linked to several stores; one unambiguous match is enough. */
/** @type {Map<string, { legacy: typeof pairs[number], target: { id: string, name: string, slug: string } }>} */
const merges = new Map();
for (const pair of pairs) {
	if (!merges.has(pair.legacy_id) && pair.matches.length === 1) {
		merges.set(pair.legacy_id, { legacy: pair, target: pair.matches[0] });
	}
}
/** One line per sauce, not per store it is linked to. */
const unresolved = [
	...new Map(
		pairs.filter((pair) => !merges.has(pair.legacy_id)).map((pair) => [pair.legacy_id, pair])
	).values()
];

for (const { legacy, target } of merges.values()) {
	console.info(
		`${legacy.store}: "${legacy.legacy_name}" -> "${target.name}" (/${legacy.legacy_slug})`
	);
}
for (const pair of unresolved) {
	const reason =
		pair.matches.length === 0 ? 'no rescraped row' : `${pair.matches.length} candidates`;
	console.warn(`UNMATCHED ${pair.store}: "${pair.legacy_name}" [${pair.handle}] — ${reason}`);
}
console.info(merges.size, 'to merge,', unresolved.length, 'unmatched');

if (!flags.apply) {
	console.info('Dry run. Re-run with --apply to write.');
	process.exit(0);
}

await db.transaction(async (tx) => {
	/** Targets already given a legacy slug, so a second legacy row does not overwrite it. */
	const reslugged = new Set();

	for (const { legacy, target } of merges.values()) {
		// A user who somehow reviewed both keeps the rescraped row's review.
		await tx.execute(sql`
			INSERT INTO checkins (user_id, hot_sauce_id, rating, review, flagged, created_at, updated_at)
			SELECT user_id, ${target.id}, rating, review, flagged, created_at, updated_at
			FROM checkins WHERE hot_sauce_id = ${legacy.legacy_id}
			ON CONFLICT DO NOTHING
		`);
		await tx.execute(sql`
			INSERT INTO wishlist (user_id, hot_sauce_id, created_at)
			SELECT user_id, ${target.id}, created_at
			FROM wishlist WHERE hot_sauce_id = ${legacy.legacy_id}
			ON CONFLICT DO NOTHING
		`);
		// Cascades the legacy check-ins, wishlist entries and store links.
		await tx.execute(sql`DELETE FROM hot_sauces WHERE id = ${legacy.legacy_id}`);

		if (!reslugged.has(target.id)) {
			await tx.execute(
				sql`UPDATE hot_sauces SET slug = ${legacy.legacy_slug}, updated_at = now() WHERE id = ${target.id}`
			);
			reslugged.add(target.id);
		}
	}
});

console.info('Merged', merges.size, 'sauces');
process.exit(0);
