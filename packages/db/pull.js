/**
 * Copies another database's catalogue (stores, makers, sauces, their store links
 * and photos) into the local one, and the photo files into the local bucket, so
 * local shows what live shows.
 *
 * Users, sessions, check-ins and wishlists are never read: personal data stays
 * where it is. Emptying the local catalogue cascades to local check-ins and
 * wishlists, which point at sauces that are about to be replaced.
 *
 *   PULL_DATABASE_URL     the source; use a read-only role
 *   PULL_IMAGE_BASE_URL   where the source's photos are served (default img.hotsauced.app)
 *   DATABASE_URL          the local database; refused unless it is on localhost
 *   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *                         the local bucket; without them only rows are copied
 */
import postgres from 'postgres';
import { imageBucketFromEnv } from './bucket.js';
import { IMAGE_WIDTHS, imageObjectName } from './images.js';
import { assertLocalDatabase } from './local.js';

/** Parents first, so every foreign key has its row when the child arrives. */
const TABLES = ['stores', 'makers', 'hot_sauces', 'store_hot_sauces', 'hot_sauce_images'];

const ROWS_PER_INSERT = 500;

const sourceUrl = process.env.PULL_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
const imageBase = (process.env.PULL_IMAGE_BASE_URL || 'https://img.hotsauced.app').replace(
	/\/$/,
	''
);

if (!sourceUrl || !targetUrl) {
	console.error('Set PULL_DATABASE_URL (the source) and DATABASE_URL (local).');
	process.exit(1);
}

// This empties tables. Pointed at a hosted database by mistake, it would wipe it.
assertLocalDatabase(targetUrl, 'DATABASE_URL must be a local database.');
if (sourceUrl === targetUrl) {
	console.error('PULL_DATABASE_URL and DATABASE_URL are the same database.');
	process.exit(1);
}

const source = postgres(sourceUrl, { max: 1 });
// The truncate's "cascades to table checkins" notices would print as full objects.
const target = postgres(targetUrl, { max: 1, onnotice: (notice) => console.info(notice.message) });

/**
 * @param {postgres.Sql} sql
 * @param {string} table
 * @returns {Promise<string[]>}
 */
async function columnsOf(sql, table) {
	const rows = await sql`
		select column_name from information_schema.columns
		where table_schema = 'public' and table_name = ${table}
		order by ordinal_position`;
	return rows.map((row) => row.column_name);
}

/**
 * The source's photos. One that predates `hot_sauce_images` has a single
 * `image_url` per sauce, carried over the way migration 0011 does it.
 */
async function sourceImages() {
	if ((await columnsOf(source, 'hot_sauce_images')).length > 0) {
		return source`select * from hot_sauce_images`;
	}
	if (!(await columnsOf(source, 'hot_sauces')).includes('image_url')) return [];
	console.info('Source has no hot_sauce_images yet; taking hot_sauces.image_url as main images');
	return source`
		select gen_random_uuid() as id, id as hot_sauce_id, image_url as source_url, 0 as position
		from hot_sauces where image_url is not null`;
}

async function copyRows() {
	/** @type {Record<string, postgres.Row[]>} */
	const data = {};
	for (const table of TABLES) {
		data[table] =
			table === 'hot_sauce_images'
				? await sourceImages()
				: await source`select * from ${source(table)}`;
	}

	await target.begin(async (sql) => {
		await sql`truncate ${sql(TABLES)} cascade`;
		for (const table of TABLES) {
			const rows = data[table];
			if (rows.length === 0) continue;
			// Only columns both sides have: the source may be a migration behind or ahead.
			const local = new Set(await columnsOf(sql, table));
			const columns = Object.keys(rows[0]).filter((column) => local.has(column));
			for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
				await sql`insert into ${sql(table)} ${sql(rows.slice(start, start + ROWS_PER_INSERT), columns)}`;
			}
			console.info(`${table}: ${rows.length} rows`);
		}
	});

	return data.hot_sauce_images;
}

/**
 * @param {postgres.Row[]} images
 */
async function copyImages(images) {
	const bucket = imageBucketFromEnv(process.env);
	if (!bucket) {
		console.info('No local bucket configured; skipping photo files');
		return;
	}

	const keys = new Set(images.map((image) => image.image_key).filter(Boolean));
	const names = [...keys].flatMap((key) =>
		IMAGE_WIDTHS.map((width) => imageObjectName(key, width))
	);
	console.info('Photo files to check:', names.length);

	let copied = 0;
	let failed = 0;
	let next = 0;
	async function worker() {
		while (next < names.length) {
			const name = names[next++];
			try {
				// Files are named by their content, so one already here is the same file.
				if (await bucket.has(name)) continue;
				const response = await fetch(`${imageBase}/${name}`);
				if (!response.ok) throw new Error(`responded ${response.status}`);
				await bucket.put(name, await response.arrayBuffer());
				copied++;
			} catch (error) {
				failed++;
				console.warn('Could not copy', name, /** @type {Error} */ (error).message);
			}
		}
	}
	await Promise.all(Array.from({ length: 8 }, worker));
	console.info('Photo files copied:', copied, failed ? `(${failed} failed)` : '');
}

try {
	const images = await copyRows();
	await copyImages(images);
} finally {
	await source.end();
	await target.end();
}
