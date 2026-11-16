<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SauceGrid from '#lib/components/SauceGrid.svelte';
	import Meta from '#lib/components/Meta.svelte';

	let { data } = $props();

	let { sauces, sauceCount, pageSize, search } = $derived(data);

	const currentPage = $derived(Math.max(Number(page.url.searchParams.get('page')) || 1, 1));

	function pageUrl(pageNumber: number) {
		const params = { ...Object.fromEntries(page.url.searchParams), page: String(pageNumber) };
		return `${resolve('/sauces')}?${new URLSearchParams(params)}`;
	}

	const previousUrl = $derived(pageUrl(currentPage - 1));
	const nextUrl = $derived(pageUrl(currentPage + 1));

	const title = $derived(search ? `Results for "${search}"` : 'All hot sauces');

	const description = $derived(
		search
			? `${sauceCount} hot sauces matching "${search}".`
			: `Browse ${sauceCount} hot sauces, newest first, with ratings and where to buy them.`
	);

	// Query strings aside from the page number would only split a listing's
	// ranking across near-identical URLs.
	const canonical = $derived(
		!search && currentPage > 1 ? `/sauces?page=${currentPage}` : '/sauces'
	);
</script>

<Meta {title} {description} {canonical} noindex={!!search} />

<div class="container">
	<div class="mb-3 flex flex-row items-center justify-between">
		<h1 class="h1">{search ? `Results for "${search}"` : 'Sauces'}</h1>

		<p class="text-gray-500">Showing {sauceCount} sauces</p>
	</div>

	{#if sauceCount === 0 && search}
		<p class="py-8 text-center text-gray-600">No sauces found matching "{search}"</p>
	{:else}
		<SauceGrid {sauces} section="all"></SauceGrid>
	{/if}

	<div class="flex flex-row justify-end gap-6 py-4">
		<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() can't take a query string -->
		<a
			href={previousUrl}
			class={currentPage < 2 ? 'pointer-events-none cursor-not-allowed opacity-70' : ''}
		>
			Prev
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->

		<span>
			{currentPage} / {Math.ceil(sauceCount / pageSize)}
		</span>

		<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() can't take a query string -->
		<a
			href={nextUrl}
			class={currentPage > Math.ceil(sauceCount / pageSize) - 1
				? 'pointer-events-none cursor-not-allowed opacity-70'
				: ''}
		>
			Next
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</div>
