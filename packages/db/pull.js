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
import { AwsClient } from 'aws4fetch';

/** Parents first, so every foreign key has its row when the child arrives. */
const TABLES = ['stores', 'makers', 'hot_sauces', 'store_hot_sauces', 'hot_sauce_images'];

/** Must match IMAGE_WIDTHS in packages/scraper/images.js. */
const IMAGE_WIDTHS = [400, 800];

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
const targetHost = new URL(targetUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(targetHost)) {
	console.error(`Refusing to write to ${targetHost}: DATABASE_URL must be a local database.`);
	process.exit(1);
}
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
	const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
	if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
		console.info('No local bucket configured; skipping photo files');
		return;
	}
	const client = new AwsClient({
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
		service: 's3',
		region: 'auto'
	});
	const bucket = `${R2_ENDPOINT.replace(/\/$/, '')}/${R2_BUCKET}`;

	const keys = new Set(
		images.flatMap((image) => [image.image_key, image.edited_key]).filter(Boolean)
	);
	const names = [...keys].flatMap((key) => IMAGE_WIDTHS.map((width) => `${key}-${width}.webp`));
	console.info('Photo files to check:', names.length);

	let copied = 0;
	let failed = 0;
	let next = 0;
	async function worker() {
		while (next < names.length) {
			const name = names[next++];
			// Files are named by their content, so one already here is the same file.
			const head = await client.fetch(`${bucket}/${name}`, { method: 'HEAD' });
			if (head.ok) continue;
			const response = await fetch(`${imageBase}/${name}`);
			if (!response.ok) {
				failed++;
				console.warn('Could not fetch', name, response.status);
				continue;
			}
			const put = await client.fetch(`${bucket}/${name}`, {
				method: 'PUT',
				body: await response.arrayBuffer(),
				headers: {
					'Content-Type': 'image/webp',
					'Cache-Control':
						response.headers.get('cache-control') ?? 'public, max-age=31536000, immutable'
				}
			});
			if (put.ok) copied++;
			else failed++;
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
