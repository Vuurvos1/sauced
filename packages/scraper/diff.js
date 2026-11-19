/**
 * Shows what a scraper change does to the catalogue, before it touches a database:
 * runs the scraper at a git ref and the working tree over the same cached shop
 * catalogues, and lists the listings and sauces that come out differently.
 *
 *   pnpm scrapers diff               working tree against HEAD
 *   pnpm scrapers diff origin/dev    against another ref
 *   pnpm scrapers diff HEAD --all    every difference, not a sample
 *
 * Reads `./cache`, so run a scrape first for any store without one; a store with
 * no cache is fetched, once, by whichever side reaches it first.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: flags, positionals } = parseArgs({
	options: { all: { type: 'boolean', default: false } },
	allowPositionals: true
});
const ref = positionals[0] ?? 'HEAD';
const SAMPLE = flags.all ? Infinity : 8;

const here = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here })
	.toString()
	.trim();

/**
 * Unpacks the scraper at `ref` inside this package, so its imports resolve
 * against the same node_modules.
 *
 * @param {string} gitRef
 */
function checkout(gitRef) {
	const dir = path.join(here, '.diff-base', gitRef.replace(/[^\w.-]+/g, '_'));
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(dir, { recursive: true });
	const archive = execFileSync('git', ['archive', gitRef, '--', 'packages/scraper'], {
		cwd: repoRoot,
		maxBuffer: 1 << 30
	});
	execFileSync('tar', ['-x', '-C', dir], { input: archive });
	return path.join(dir, 'packages/scraper');
}

/**
 * @typedef {{ store: string, url: string, name: string, maker: string | null, images: string[], sauce: string }} Listing
 */

/**
 * Runs every enabled store of the scraper in `dir` from cache.
 *
 * @param {string} dir
 * @returns {Promise<Map<string, Listing>>} keyed by store and product URL
 */
async function run(dir) {
	const { default: scrapers, enabledKeys } = await import(path.join(dir, 'scrapers.js'));
	const dedup = await import(path.join(dir, 'dedup.js'));
	const { sauceAliases } = await import(path.join(dir, 'stores.js'));

	const options = { cache: true, dbInsert: false, dev: false };
	/** @type {{ storeKey: string, english: boolean, sauce: any }[]} */
	const rows = [];
	const log = console.info;
	console.info = () => {};
	try {
		for (const key of enabledKeys) {
			const scraper = scrapers[key];
			try {
				for (const url of await scraper.getSauceUrls(scraper.url, options)) {
					const sauce = await scraper.scrapeSauce(url, options);
					if (sauce)
						rows.push({ storeKey: key, english: (scraper.language ?? 'en') === 'en', sauce });
				}
			} catch (error) {
				console.warn(
					`${key} failed in ${path.relative(here, dir) || 'working tree'}:`,
					/** @type {Error} */ (error).message
				);
			}
		}
	} finally {
		console.info = log;
	}

	// Same steps as the real run, so merges and maker fixes show up too.
	const registry = dedup.buildMakerRegistry(rows);
	dedup.applyRegistry(rows, registry);
	const groups = dedup.groupByIdentity(rows, dedup.buildAliasMap(sauceAliases));

	/** @type {Map<string, Listing>} */
	const listings = new Map();
	for (const group of groups.values()) {
		const sauce = dedup.displayName(group.rows);
		for (const row of group.rows) {
			const { sauce: s } = row;
			// Before galleries a listing had one `imageUrl`.
			const images = s.imageUrls ?? (s.imageUrl ? [s.imageUrl] : []);
			listings.set(`${row.storeKey} ${s.url}`, {
				store: row.storeKey,
				url: s.url,
				name: s.name,
				maker: s.maker ?? null,
				images,
				sauce: `${sauce} (${registry.get(group.makerKey) ?? 'no maker'})`
			});
		}
	}
	return listings;
}

/**
 * @param {string} title
 * @param {string[]} lines
 */
function section(title, lines) {
	if (lines.length === 0) return;
	console.info(`\n${title}: ${lines.length}`);
	for (const line of lines.slice(0, SAMPLE)) console.info(`  ${line}`);
	if (lines.length > SAMPLE) console.info(`  … ${lines.length - SAMPLE} more (--all to list them)`);
}

const base = checkout(ref);
let before;
try {
	before = await run(base);
} finally {
	// Its test files would otherwise be picked up by vitest.
	fs.rmSync(path.join(here, '.diff-base'), { recursive: true, force: true });
}
const after = await run(here);

const added = [];
const removed = [];
const renamed = [];
const remade = [];
const reimaged = [];
for (const [id, listing] of after) {
	const old = before.get(id);
	if (!old) {
		added.push(`${listing.store}: ${listing.name}`);
		continue;
	}
	if (old.name !== listing.name)
		renamed.push(`${listing.store}: "${old.name}" → "${listing.name}"`);
	if (old.maker !== listing.maker)
		remade.push(`${listing.store}: ${listing.name}: ${old.maker} → ${listing.maker}`);
	if (old.images.join() !== listing.images.join()) {
		reimaged.push(
			`${listing.store}: ${listing.name}: ${old.images.length} → ${listing.images.length} photos`
		);
	}
}
for (const [id, listing] of before)
	if (!after.has(id)) removed.push(`${listing.store}: ${listing.name}`);

/**
 * Which listings each sauce gathers. A sauce whose set changed was merged, split
 * or renamed.
 *
 * @param {Map<string, Listing>} listings
 */
function sauces(listings) {
	/** @type {Map<string, string[]>} */
	const bySauce = new Map();
	for (const [id, listing] of listings) {
		if (!bySauce.has(listing.sauce)) bySauce.set(listing.sauce, []);
		bySauce.get(listing.sauce)?.push(id);
	}
	return new Map([...bySauce].map(([name, ids]) => [name, ids.sort().join('\n')]));
}
const saucesBefore = sauces(before);
const saucesAfter = sauces(after);
const membersBefore = new Set(saucesBefore.values());
const membersAfter = new Set(saucesAfter.values());
const gone = [...saucesBefore].filter(([, ids]) => !membersAfter.has(ids)).map(([name]) => name);
const formed = [...saucesAfter].filter(([, ids]) => !membersBefore.has(ids)).map(([name]) => name);

console.info(`${ref}: ${before.size} listings, ${saucesBefore.size} sauces`);
console.info(`working tree: ${after.size} listings, ${saucesAfter.size} sauces`);
section('Listings renamed', renamed);
section('Listings with a different maker', remade);
section('Listings with different photos', reimaged);
section('Listings only in the working tree', added);
section(`Listings only in ${ref}`, removed);
section(`Sauces in ${ref} that no longer come out the same (merged, split or renamed)`, gone);
section('Sauces the working tree makes instead', formed);
if (
	renamed.length + remade.length + reimaged.length + added.length + removed.length + gone.length ===
	0
) {
	console.info('\nNo differences.');
}
