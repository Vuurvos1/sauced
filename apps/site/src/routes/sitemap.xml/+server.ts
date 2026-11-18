import { PUBLIC_BASE_URL } from '$app/env/public';
import { db } from '#lib/server/db.js';
import { hotSauces, makers, stores } from '@app/db/schema';
import { asc, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { visibleSauce } from '#lib/server/sauces.js';

/**
 * Kept cheap in CPU, the budget that matters on Workers (10 ms per request on the
 * free plan): with ~2,300 entries, a URL parse, an XML-escape regex and a Date per
 * entry cost ~12 ms. Postgres formats the dates, the base URL is escaped once, and
 * slugs only need encodeURIComponent, which leaves nothing for XML to escape.
 */
const escapeXml = (value: string) =>
	value.replace(
		/[<>&'"]/g,
		(char) =>
			({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string
	);

const base = escapeXml(new URL('/', PUBLIC_BASE_URL).href.replace(/\/$/, ''));

/** `YYYY-MM-DD`, formatted by Postgres instead of parsed into a Date and back. */
const day = (column: PgColumn) => sql<string>`to_char(${column}, 'YYYY-MM-DD')`;

const entry = (path: string, lastmod?: string) =>
	lastmod
		? `\t<url>\n\t\t<loc>${base}${path}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t</url>`
		: `\t<url>\n\t\t<loc>${base}${path}</loc>\n\t</url>`;

const entries = (prefix: string, rows: { slug: string; lastmod: string }[]) =>
	rows.map((row) => entry(`${prefix}/${encodeURIComponent(row.slug)}`, row.lastmod));

// One sitemap holds 50k URLs. Past that this needs splitting behind an index.
export async function GET({ setHeaders }) {
	const [sauceRows, makerRows, storeRows] = await Promise.all([
		db
			.select({ slug: hotSauces.slug, lastmod: day(hotSauces.updatedAt) })
			.from(hotSauces)
			.where(visibleSauce)
			.orderBy(asc(hotSauces.slug)),
		db
			.select({ slug: makers.slug, lastmod: day(makers.updatedAt) })
			.from(makers)
			.orderBy(asc(makers.slug)),
		db
			.select({ slug: stores.slug, lastmod: day(stores.updatedAt) })
			.from(stores)
			.orderBy(asc(stores.slug))
	]);

	setHeaders({
		'content-type': 'application/xml; charset=utf-8',
		'cache-control': 'public, max-age=0, s-maxage=3600'
	});

	return new Response(
		[
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
			entry('/'),
			entry('/sauces'),
			entry('/makers'),
			entry('/stores'),
			...entries('/sauces', sauceRows),
			...entries('/makers', makerRows),
			...entries('/stores', storeRows),
			'</urlset>',
			''
		].join('\n')
	);
}
