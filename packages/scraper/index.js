import parser from 'yargs-parser';
import fs from 'node:fs';
import scrapers from './scrapers.js';
import { getDb } from '@app/db';
import { hotSauces, makers, stores, storeHotSauces } from '@app/db/schema';
import { normalizeName, isSimilarName, slugifyName } from './utils/index.js';
import { eq, notExists, sql } from 'drizzle-orm';

import 'dotenv/config';

const [, , ...args] = process.argv;
const flags = parser(args, {
	boolean: ['noCache', 'dbInsert']
});

const db = getDb(process.env.DATABASE_URL);

/**
 * Upserts every brand seen in a batch and returns normalised name -> maker id.
 * Existing makers are matched fuzzily first, so "Queen Majesty" and "Queen
 * Majesty Hot Sauce" do not become two brands.
 *
 * @param {import('./index.d').Sauce[]} data
 * @returns {Promise<Map<string, string>>}
 */
async function upsertMakers(data) {
	const existing = await db.select({ id: makers.makerId, name: makers.name }).from(makers);

	/** @type {Map<string, string>} */
	const byName = new Map();
	for (const row of existing) byName.set(normalizeName(row.name), row.id);

	/** @type {string[]} */
	const fresh = [];
	for (const sauce of data) {
		const name = String(sauce.maker ?? '').trim();
		if (!name) continue;
		const key = normalizeName(name);
		if (byName.has(key)) continue;

		const match = existing.find((row) => isSimilarName(row.name, name));
		if (match) {
			byName.set(key, match.id);
			continue;
		}
		if (!fresh.some((candidate) => isSimilarName(candidate, name))) fresh.push(name);
	}

	if (fresh.length > 0) {
		const inserted = await db
			.insert(makers)
			.values(fresh.map((name) => ({ name, slug: slugifyName(name) })))
			.onConflictDoNothing()
			.returning({ id: makers.makerId, name: makers.name });
		for (const row of inserted) byName.set(normalizeName(row.name), row.id);
	}

	// Anything dropped by onConflictDoNothing, plus the fuzzy aliases.
	const all = await db.select({ id: makers.makerId, name: makers.name }).from(makers);
	for (const sauce of data) {
		const name = String(sauce.maker ?? '').trim();
		if (!name) continue;
		const key = normalizeName(name);
		if (byName.has(key)) continue;
		const match = all.find((row) => isSimilarName(row.name, name));
		if (match) byName.set(key, match.id);
	}

	return byName;
}

/**
 * @param {import('./index.d').SauceScraper} scraper
 * @param {import('./index.d').Sauce[]} data
 */
async function insertStoreData(scraper, data) {
	// upsert store data
	console.info('Upserting store data');
	const store = await db
		.insert(stores)
		.values({
			name: scraper.name,
			url: scraper.url
		})
		.onConflictDoUpdate({
			target: stores.name,
			set: {
				url: scraper.url
			}
		})
		.returning();

	// Brands arrive spelled differently per shop, so match them the same fuzzy way
	// sauces are matched rather than trusting the string.
	console.info('Upserting makers');
	const makerIds = await upsertMakers(data);

	console.info('Inserting hot sauce data');
	const existingSauceNames = await db
		.select({ id: hotSauces.sauceId, name: hotSauces.name, description: hotSauces.description })
		.from(hotSauces);

	const { newSauces, existingSauces } = data.reduce(
		(acc, sauce) => {
			const normalizedNewName = normalizeName(sauce.name);
			const existing = existingSauceNames.find((existing) =>
				isSimilarName(normalizeName(existing.name), normalizedNewName)
			);

			sauce.makerId = makerIds.get(normalizeName(sauce.maker ?? '')) ?? null;
			delete sauce.maker;

			if (existing) {
				sauce.sauceId = existing.id;
				acc.existingSauces.push(sauce);
			} else {
				acc.newSauces.push(sauce);
			}
			return acc;
		},
		/** @type {{ newSauces: import('./index.d').Sauce[], existingSauces: (import('./index.d').Sauce)[] }} */
		({ newSauces: [], existingSauces: [] })
	);

	console.info('Matched', existingSauces.length, 'existing,', newSauces.length, 'new');

	let writeFailures = 0;

	// A shop that publishes in its own language may fill an empty description, but
	// must not overwrite an English one — Maison Piquante and Sweet Pepper were
	// replacing English copy with French on sauces five other shops also stock.
	const writesEnglish = (scraper.language ?? 'en') === 'en';

	// update existing sauces
	for (const sauce of existingSauces) {
		if (!sauce.sauceId) continue;

		const existing = existingSauceNames.find((row) => row.id === sauce.sauceId);
		const keepDescription = !writesEnglish && Boolean(existing?.description);

		/** Name and slug are identity: rewriting them from another shop's spelling
		 * collides with the unique indexes, and the slug is already a live URL. */
		const changes = {
			description: keepDescription ? existing?.description : sauce.description,
			imageUrl: sauce.imageUrl,
			...(sauce.makerId ? { makerId: sauce.makerId } : {})
		};

		try {
			await db.update(hotSauces).set(changes).where(eq(hotSauces.sauceId, sauce.sauceId));
		} catch (error) {
			writeFailures++;
			console.error('Error updating sauce', sauce.name, error);
		}
	}

	// insert new sauces
	if (newSauces.length > 0) {
		const sauces = await db
			.insert(hotSauces)
			.values(newSauces)
			.onConflictDoNothing()
			.returning({ id: hotSauces.sauceId, name: hotSauces.name });
		existingSauceNames.push(...sauces);
	}

	console.info('Inserting store hot sauce data');
	for (const sauce of data) {
		const s = existingSauceNames.find((s) => isSimilarName(s.name, sauce.name));
		if (!s) {
			writeFailures++;
			console.error('Sauce not found', sauce.name);
			continue;
		}

		await db
			.insert(storeHotSauces)
			.values({
				sauceId: s.id,
				storeId: store[0].storeId,
				url: sauce.url
			})
			.onConflictDoUpdate({
				target: [storeHotSauces.sauceId, storeHotSauces.storeId],
				set: {
					url: sauce.url
				}
			});
	}

	return writeFailures;
}

/**
 * @param {import('./index.d').SauceScraper} scraper
 * @param {import('./index.d').ScrapeSauceOptions} options
 */
async function scrapeStore(scraper, options) {
	console.info(`Running scraper - ${scraper.name} - ${scraper.url}`);
	let urls = await scraper.getSauceUrls(scraper.url, options);

	// limit to 12 random urls
	if (options.dev) {
		urls = urls.sort(() => Math.random() - 0.5).slice(0, 12);
	}

	/** @type {import('./index.d').Sauce[]} */
	const data = [];
	for (const url of urls) {
		const sauce = await scraper.scrapeSauce(url, options);
		if (sauce) data.push(sauce);
	}

	console.info('Found', data.length, 'sauces');

	// A live store never legitimately returns nothing; heatsupply and heatonist
	// sat broken for weeks behind a green pipeline because this was not checked.
	if (data.length === 0) {
		throw new Error('returned 0 sauces');
	}

	if (options.dbInsert) {
		const writeFailures = await insertStoreData(scraper, data);
		if (writeFailures > 0) {
			throw new Error(`${writeFailures} of ${data.length} sauces failed to save`);
		}
	}

	return data;
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

	const selected = key === 'all' ? Object.keys(scrapers) : [key];

	/** @type {import('./index.d').ScrapeSauceOptions} */
	const options = {
		cache: !flags.noCache,
		dbInsert: flags.dbInsert,
		dev: flags.dev
	};

	/** @type {import('./index.d').Sauce[]} */
	const data = [];
	/** @type {string[]} */
	const failed = [];

	for (const name of selected) {
		try {
			data.push(...(await scrapeStore(scrapers[name], options)));
		} catch (error) {
			// Run the rest regardless, so one broken store does not hide the others.
			console.error(`Scraper ${name} failed:`, /** @type {Error} */ (error).message);
			failed.push(name);
		}
	}

	// Dedup can leave a brand behind when all its sauces merge into rows credited
	// to someone else. An empty brand page is worse than no page.
	if (options.dbInsert && selected.length > 1) {
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

	console.info('Writing to data.json');
	fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));

	console.info('done in', Math.round(performance.now() - startTime), 'ms');

	if (failed.length > 0) {
		console.error('Failed scrapers:', failed.join(', '));
		process.exit(1);
	}

	process.exit(0);
}

main();
