import parser from 'yargs-parser';
import fs from 'node:fs';
import scrapers from './scrapers.js';
import { getDb } from '@app/db/index.js';
import { hotSauces, stores, storeHotSauces } from '@app/db/schema.js';
import { normalizeName, isSimilarName } from './utils/index.js';
import { eq } from 'drizzle-orm';

import 'dotenv/config';

const [, , ...args] = process.argv;
const flags = parser(args, {
	boolean: ['noCache', 'dbInsert']
});

const db = getDb(process.env.DATABASE_URL);

async function main() {
	const startTime = performance.now();
	const command = flags['_'].shift();

	if (!command) {
		console.error('No command provided');
		process.exit(1);
	}

	const scraper = scrapers[command.toString().toLowerCase()];

	if (!scraper) {
		console.error('No scraper found for', command);
		process.exit(1);
	}

	/** @type {import('./index.d').ScrapeSauceOptions} */
	const options = {
		cache: !flags.noCache,
		dbInsert: flags.dbInsert
	};

	console.info(`Running scraper - ${scraper.name} - ${scraper.url}`);
	const urls = await scraper.getSauceUrls(scraper.url, options);

	/** @type {import('./index.d').Sauce[]} */
	const data = [];
	for (const url of urls) {
		const sauce = await scraper.scrapeSauce(url, options);
		if (sauce) data.push(sauce);
	}

	console.info('Found', data.length, 'sauces');

	if (options.dbInsert) {
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

		console.info('Inserting hot sauce data');
		const existingSauceNames = await db
			.select({ id: hotSauces.sauceId, name: hotSauces.name })
			.from(hotSauces);

		const { newSauces, existingSauces } = data.reduce(
			(acc, sauce) => {
				const normalizedNewName = normalizeName(sauce.name);
				const existing = existingSauceNames.find((existing) =>
					isSimilarName(normalizeName(existing.name), normalizedNewName)
				);

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

		console.info('Deduped', data.length - existingSauces.length, 'sauces');

		// update existing sauces
		for (const sauce of existingSauces) {
			if (!sauce.sauceId) continue;
			try {
				await db.update(hotSauces).set(sauce).where(eq(hotSauces.sauceId, sauce.sauceId));
			} catch (error) {
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
	}

	console.info('Writing to data.json');
	fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));

	console.info('done in', Math.round(performance.now() - startTime), 'ms');
	process.exit(0);
}

main();
