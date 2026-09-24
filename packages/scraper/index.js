import parser from 'yargs-parser';
import fs from 'node:fs';
import scrapers, { enabledKeys } from './scrapers.js';
import { sauceAliases } from './stores.js';
import { getDb } from '@app/db';
import { hotSauces, makers, stores, storeHotSauces } from '@app/db/schema';
import {
	buildAliasMap,
	buildMakerRegistry,
	bestDescription,
	displayName,
	groupByIdentity,
	applyRegistry,
	uniqueSlug
} from './dedup.js';
import {
	canonicalMakerName,
	canonicalSauceName,
	sauceDedupKey,
	slugifyName
} from './utils/index.js';
import { eq, inArray, notExists, sql } from 'drizzle-orm';

import 'dotenv/config';

const [, , ...args] = process.argv;
const flags = parser(args, {
	boolean: ['noCache', 'dbInsert']
});

const db = getDb(process.env.DATABASE_URL);

/** Rows per multi-row insert — large enough to be few trips, small enough to stay
 * under Postgres' bind-parameter ceiling. */
const LINK_CHUNK_SIZE = 1000;

/**
 * Resolves every canonical brand in the run to a `makers` row, inserting the
 * ones that are new. Legacy rows that canonicalise the same — "Dawson's" and
 * "Dawson's Hot Sauce" both exist from earlier runs — collapse onto whichever
 * sorts first, and the loser is left for the orphan sweep once its sauces move.
 *
 * @param {Map<string, string>} registry
 * @returns {Promise<Map<string, string>>} canonical key -> maker id
 */
async function resolveMakers(registry) {
	const existing = await db.select({ id: makers.makerId, name: makers.name }).from(makers);

	/** @type {Map<string, string>} */
	const ids = new Map();

	/** @param {{ id: string, name: string }[]} rows */
	const remember = (rows) => {
		for (const row of rows) {
			const key = canonicalMakerName(row.name);
			if (key && !ids.has(key)) ids.set(key, row.id);
		}
	};

	remember([...existing].sort((a, b) => a.name.localeCompare(b.name)));

	const fresh = [...registry.entries()].filter(([key]) => !ids.has(key));
	if (fresh.length > 0) {
		const taken = new Set(existing.map((row) => slugifyName(row.name)));
		const inserted = await db
			.insert(makers)
			.values(
				fresh.map(([, display]) => ({ name: display, slug: uniqueSlug(display, null, taken) }))
			)
			.onConflictDoNothing()
			.returning({ id: makers.makerId, name: makers.name });

		remember(inserted);
	}

	return ids;
}

/**
 * Loads the sauces already stored, keyed the same way this run keys its rows so
 * a re-run updates rather than duplicates.
 *
 * A stored sauce with no maker cannot be keyed globally — that is exactly the
 * evidence it lacks — so it is keyed to each store that links it, matching how
 * `sauceDedupKey` scopes a maker-less listing.
 *
 * @param {Map<string, string>} storeKeysById store id -> config key
 * @param {Map<string, string>} aliases from `buildAliasMap`; the stored name can be
 * either of an alias pair, depending on which shops listed it first
 * @returns {Promise<{ byKey: Map<string, import('./index.d').StoredSauce>, slugs: Set<string> }>}
 */
async function loadStoredSauces(storeKeysById, aliases) {
	const stored = await db
		.select({
			id: hotSauces.sauceId,
			name: hotSauces.name,
			slug: hotSauces.slug,
			description: hotSauces.description,
			imageUrl: hotSauces.imageUrl,
			makerId: hotSauces.makerId,
			makerName: makers.name
		})
		.from(hotSauces)
		.leftJoin(makers, eq(makers.makerId, hotSauces.makerId));

	/** @type {Map<string, string[]>} sauce id -> store ids */
	const links = new Map();
	if (storeKeysById.size > 0) {
		const rows = await db
			.select({ sauceId: storeHotSauces.sauceId, storeId: storeHotSauces.storeId })
			.from(storeHotSauces)
			.where(inArray(storeHotSauces.storeId, [...storeKeysById.keys()]));
		for (const row of rows) {
			if (!links.has(row.sauceId)) links.set(row.sauceId, []);
			links.get(row.sauceId).push(row.storeId);
		}
	}

	/** @type {Map<string, import('./index.d').StoredSauce>} */
	const byKey = new Map();
	/** @param {string} key @param {import('./index.d').StoredSauce} row */
	const remember = (key, row) => byKey.set(aliases.get(key) ?? key, row);

	for (const row of stored) {
		if (row.makerName) {
			remember(sauceDedupKey(row.name, row.makerName), row);
			continue;
		}
		for (const storeId of links.get(row.id) ?? []) {
			const storeKey = storeKeysById.get(storeId);
			if (storeKey) remember(sauceDedupKey(row.name, null, storeKey), row);
		}
	}

	// `slug` is already loaded here, so the caller has no reason to scan the table
	// a second time just to learn which slugs are taken.
	return { byKey, slugs: new Set(stored.map((row) => row.slug)) };
}

/**
 * Phase 5. Writes the whole run: stores, makers, one row per distinct sauce, and
 * a link from every listing back to the shop selling it.
 *
 * @param {import('./index.d').StoreRun[]} runs
 * @returns {Promise<number>} listings that could not be written
 */
async function writeCatalogue(runs) {
	const rows = runs.flatMap((run) => run.rows);

	console.info('Building maker registry');
	const registry = buildMakerRegistry(rows);
	const recovered = applyRegistry(rows, registry);
	console.info(
		'Found',
		registry.size,
		'makers,',
		recovered,
		'recovered from titles;',
		rows.filter((row) => row.sauce.maker).length,
		'of',
		rows.length,
		'listings have one'
	);

	console.info('Upserting stores');
	/** @type {Map<string, string>} config key -> store id */
	const storeIds = new Map();
	for (const run of runs) {
		const [store] = await db
			.insert(stores)
			.values({ name: run.scraper.name, url: run.scraper.url })
			.onConflictDoUpdate({ target: stores.name, set: { url: run.scraper.url } })
			.returning();
		storeIds.set(run.storeKey, store.storeId);
	}

	const storeKeysById = new Map([...storeIds].map(([key, id]) => [id, key]));

	console.info('Upserting makers');
	const makerIds = await resolveMakers(registry);

	const aliases = buildAliasMap(sauceAliases);
	const groups = groupByIdentity(rows, aliases);
	const { byKey: stored, slugs: takenSlugs } = await loadStoredSauces(storeKeysById, aliases);
	console.info(
		'Resolved',
		rows.length,
		'listings to',
		groups.size,
		'sauces;',
		[...groups.values()].filter((group) => group.rows.length > 1).length,
		'are stocked more than once'
	);

	/** @type {Map<string, string>} dedup key -> sauce id */
	const sauceIds = new Map();
	let writeFailures = 0;

	console.info('Updating sauces already stored');
	for (const [key, group] of groups) {
		const existing = stored.get(key);
		if (!existing) continue;

		sauceIds.set(key, existing.id);

		const description = bestDescription(group.rows);
		const keepDescription = Boolean(existing.description) && !description.english;
		const makerId = makerIds.get(group.makerKey) ?? null;
		const imageUrl = group.rows.find((row) => row.sauce.imageUrl)?.sauce.imageUrl;

		/** Name and slug are identity: the slug is already a live URL, and another
		 * shop's spelling of the name is not a reason to move it. */
		const changes = {
			...(description.text && !keepDescription ? { description: description.text } : {}),
			...(imageUrl && !existing.imageUrl ? { imageUrl } : {}),
			// Fill a missing brand, and repoint a legacy duplicate of the same brand
			// at the canonical row — but never reattribute to a different brand.
			...(makerId && makerId !== existing.makerId ? { makerId } : {})
		};

		if (Object.keys(changes).length === 0) continue;

		try {
			await db.update(hotSauces).set(changes).where(eq(hotSauces.sauceId, existing.id));
		} catch (error) {
			writeFailures++;
			console.error('Error updating sauce', existing.name, error);
		}
	}

	const fresh = [...groups.entries()].filter(([key]) => !stored.has(key));

	if (fresh.length > 0) {
		console.info('Inserting', fresh.length, 'new sauces');

		const values = fresh.map(([key, group]) => {
			const name = displayName(group.rows);
			const maker = registry.get(group.makerKey) ?? null;
			const description = bestDescription(group.rows);
			return {
				key,
				name,
				slug: uniqueSlug(name, maker, takenSlugs),
				description: description.text,
				imageUrl: group.rows.find((row) => row.sauce.imageUrl)?.sauce.imageUrl ?? null,
				makerId: makerIds.get(group.makerKey) ?? null
			};
		});

		const inserted = await db
			.insert(hotSauces)
			.values(values.map(({ key, ...columns }) => columns))
			.onConflictDoNothing()
			.returning({ id: hotSauces.sauceId, slug: hotSauces.slug });

		// Match on the slug, not the name: a name is only unique per maker now, and
		// the slug is the value this run generated.
		const idsBySlug = new Map(inserted.map((row) => [row.slug, row.id]));
		for (const value of values) {
			const id = idsBySlug.get(value.slug);
			if (id) sauceIds.set(value.key, id);
			else {
				writeFailures++;
				console.error('Sauce dropped on insert:', value.name, `(${value.slug})`);
			}
		}
	}

	console.info('Linking sauces to stores');

	// Keyed by the pair rather than pushed straight into an array: a shop can list
	// one sauce under two URLs, and Postgres rejects a row touched twice by the
	// same ON CONFLICT. Last URL wins, as the per-row upsert did.
	/** @type {Map<string, { sauceId: string, storeId: string, url: string }>} */
	const links = new Map();
	for (const [key, group] of groups) {
		const sauceId = sauceIds.get(key);
		if (!sauceId) continue;

		for (const row of group.rows) {
			const storeId = storeIds.get(row.storeKey);
			links.set(`${sauceId}:${storeId}`, { sauceId, storeId, url: row.sauce.url });
		}
	}

	// One round trip per chunk, not per listing: a full run links ~3700 of them,
	// and a serialised insert apiece is minutes of latency against a hosted server.
	const batch = [...links.values()];
	for (let start = 0; start < batch.length; start += LINK_CHUNK_SIZE) {
		await db
			.insert(storeHotSauces)
			.values(batch.slice(start, start + LINK_CHUNK_SIZE))
			.onConflictDoUpdate({
				target: [storeHotSauces.sauceId, storeHotSauces.storeId],
				set: { url: sql`excluded.url` }
			});
	}

	return writeFailures;
}

/**
 * @param {string} storeKey
 * @param {import('./index.d').SauceScraper} scraper
 * @param {import('./index.d').ScrapeSauceOptions} options
 * @returns {Promise<import('./index.d').StoreRun>}
 */
async function scrapeStore(storeKey, scraper, options) {
	console.info(`Running scraper - ${scraper.name} - ${scraper.url}`);
	let urls = await scraper.getSauceUrls(scraper.url, options);

	// limit to 12 random urls
	if (options.dev) {
		urls = urls.sort(() => Math.random() - 0.5).slice(0, 12);
	}

	const english = (scraper.language ?? 'en') === 'en';

	/** @type {import('./index.d').ScrapedRow[]} */
	const rows = [];
	for (const url of urls) {
		const sauce = await scraper.scrapeSauce(url, options);
		if (sauce) rows.push({ storeKey, english, sauce });
	}

	console.info('Found', rows.length, 'sauces');

	// A live store never legitimately returns nothing; heatsupply and heatonist
	// sat broken for weeks behind a green pipeline because this was not checked.
	if (rows.length === 0) {
		throw new Error('returned 0 sauces');
	}

	return { storeKey, scraper, rows };
}

async function main() {
	const startTime = performance.now();
	const command = flags['_'].shift();

	if (!command) {
		console.error('No command provided');
		process.exit(1);
	}

	const key = command.toString().toLowerCase();

	if (key !== 'all' && !scrapers[key]) {
		console.error('No scraper found for', command);
		console.error('Available: all,', Object.keys(scrapers).join(', '));
		process.exit(1);
	}

	const selected = key === 'all' ? enabledKeys : [key];

	/** @type {import('./index.d').ScrapeSauceOptions} */
	const options = {
		cache: !flags.noCache,
		dbInsert: flags.dbInsert,
		dev: flags.dev
	};

	// Phase 1. Every store is scraped before anything is resolved: a brand only
	// one shop publishes is what identifies the same sauce in a shop that
	// publishes none, so the registry cannot be built store by store.
	/** @type {import('./index.d').StoreRun[]} */
	const runs = [];
	/** @type {string[]} */
	const failed = [];

	for (const name of selected) {
		try {
			runs.push(await scrapeStore(name, scrapers[name], options));
		} catch (error) {
			// Run the rest regardless, so one broken store does not hide the others.
			const { message, cause } = /** @type {Error} */ (error);
			// Node's `fetch failed` hides the network error (reset, timeout, TLS) in `cause`.
			console.error(`Scraper ${name} failed:`, message, cause ?? '');
			failed.push(name);
		}
	}

	if (options.dbInsert && runs.length > 0) {
		const writeFailures = await writeCatalogue(runs);

		// Dedup can leave a brand behind when all its sauces merge into rows credited
		// to someone else. An empty brand page is worse than no page.
		if (selected.length > 1) {
			const orphaned = await db
				.delete(makers)
				.where(
					notExists(
						db
							.select({ n: sql`1` })
							.from(hotSauces)
							.where(eq(hotSauces.makerId, makers.makerId))
					)
				)
				.returning({ id: makers.makerId });
			if (orphaned.length > 0) console.info('Removed', orphaned.length, 'makers with no sauces');
		}

		if (writeFailures > 0) {
			console.error(writeFailures, 'listings failed to save');
			failed.push('write');
		}
	}

	console.info('Writing to data.json');
	fs.writeFileSync(
		'./data.json',
		JSON.stringify(
			runs.flatMap((run) => run.rows.map((row) => row.sauce)),
			null,
			2
		)
	);

	console.info('done in', Math.round(performance.now() - startTime), 'ms');

	if (failed.length > 0) {
		console.error('Failed:', failed.join(', '));
		process.exit(1);
	}

	process.exit(0);
}

main();
