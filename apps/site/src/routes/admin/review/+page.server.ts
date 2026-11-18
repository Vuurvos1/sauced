import { db } from '#lib/server/db.js';
import { requireAdmin } from '#lib/server/admin.js';
import { mainImage } from '#lib/server/images.js';
import { hotSauceImages, hotSauces, makers } from '@app/db/schema';
import { and, count, desc, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm';

const PAGE_SIZE = 48;

const hasPendingPhotos = exists(
	db
		.select({ one: sql`1` })
		.from(hotSauceImages)
		.where(and(eq(hotSauceImages.sauceId, hotSauces.sauceId), eq(hotSauceImages.pending, true)))
);

/** Each tab is a slice of the catalogue an admin works through. */
const shown = isNull(hotSauces.hiddenAt);
const FILTERS = {
	unreviewed: and(shown, isNull(hotSauces.reviewedAt)),
	pending: and(shown, isNotNull(hotSauces.reviewedAt), hasPendingPhotos),
	reviewed: and(shown, isNotNull(hotSauces.reviewedAt)),
	hidden: isNotNull(hotSauces.hiddenAt)
} as const;

type Filter = keyof typeof FILTERS;

export async function load({ locals, url }) {
	requireAdmin(locals);

	const param = url.searchParams.get('show');
	const show: Filter = param && param in FILTERS ? (param as Filter) : 'unreviewed';
	const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);

	const photoCount = (where: ReturnType<typeof and>) =>
		sql<number>`(select count(*) from ${hotSauceImages} where ${hotSauceImages.sauceId} = ${hotSauces.sauceId} and ${where})`.mapWith(
			Number
		);

	const [sauces, counts] = await Promise.all([
		db
			.select({
				slug: hotSauces.slug,
				name: hotSauces.name,
				makerName: makers.name,
				...mainImage,
				photos: photoCount(
					and(eq(hotSauceImages.hidden, false), eq(hotSauceImages.pending, false))
				),
				pendingPhotos: photoCount(eq(hotSauceImages.pending, true))
			})
			.from(hotSauces)
			.leftJoin(makers, eq(makers.makerId, hotSauces.makerId))
			.where(FILTERS[show])
			.orderBy(desc(hotSauces.createdAt), hotSauces.sauceId)
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		Promise.all(
			Object.entries(FILTERS).map(async ([name, where]) => {
				const [row] = await db.select({ n: count() }).from(hotSauces).where(where);
				return [name, row.n] as const;
			})
		)
	]);

	const totals = Object.fromEntries(counts) as Record<Filter, number>;
	return { sauces, show, page, totals, pages: Math.max(Math.ceil(totals[show] / PAGE_SIZE), 1) };
}
