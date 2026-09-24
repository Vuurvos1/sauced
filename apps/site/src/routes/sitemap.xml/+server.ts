import { PUBLIC_BASE_URL } from '$env/static/public';
import { db } from '$lib/server/db';
import { hotSauces, makers, stores } from '@app/db/schema';
import { asc } from 'drizzle-orm';

type Entry = { path: string; lastmod?: Date | null };

const escapeXml = (value: string) =>
	value.replace(
		/[<>&'"]/g,
		(char) =>
			({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string
	);

const entry = ({ path, lastmod }: Entry) => {
	const loc = `\t\t<loc>${escapeXml(new URL(path, PUBLIC_BASE_URL).href)}</loc>`;
	const date = lastmod ? `\n\t\t<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';

	return `\t<url>\n${loc}${date}\n\t</url>`;
};

// One sitemap holds 50k URLs. Past that this needs splitting behind an index.
export async function GET({ setHeaders }) {
	const [sauceRows, makerRows, storeRows] = await Promise.all([
		db
			.select({ slug: hotSauces.slug, updatedAt: hotSauces.updatedAt })
			.from(hotSauces)
			.orderBy(asc(hotSauces.slug)),
		db
			.select({ slug: makers.slug, updatedAt: makers.updatedAt })
			.from(makers)
			.orderBy(asc(makers.slug)),
		db
			.select({ name: stores.name, updatedAt: stores.updatedAt })
			.from(stores)
			.orderBy(asc(stores.name))
	]);

	const entries: Entry[] = [
		{ path: '/' },
		{ path: '/sauces' },
		{ path: '/makers' },
		{ path: '/stores' },
		...sauceRows.map((row) => ({ path: `/sauces/${row.slug}`, lastmod: row.updatedAt })),
		...makerRows.map((row) => ({ path: `/makers/${row.slug}`, lastmod: row.updatedAt })),
		// Store pages are still keyed on the name rather than a slug.
		...storeRows.map((row) => ({
			path: `/stores/${encodeURIComponent(row.name)}`,
			lastmod: row.updatedAt
		}))
	];

	setHeaders({
		'content-type': 'application/xml; charset=utf-8',
		'cache-control': 'public, max-age=0, s-maxage=3600'
	});

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry).join('\n')}
</urlset>
`
	);
}
