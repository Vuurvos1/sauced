<script lang="ts">
	import { page } from '$app/state';
	import SauceGrid from '$lib/components/SauceGrid.svelte';

	let { data } = $props();

	let { sauces, sauceCount, pageSize, search } = $derived(data);

	const currentPage = $derived(Math.max(Number(page.url.searchParams.get('page')) || 1, 1));

	const previousUrl = $derived.by(() => {
		const url = new URL(page.url);
		url.searchParams.set('page', String(currentPage - 1));
		return url.toString();
	});

	const nextUrl = $derived.by(() => {
		const url = new URL(page.url);
		url.searchParams.set('page', String(currentPage + 1));
		return url.toString();
	});
</script>

<div class="container">
	<div class="flex flex-row items-center justify-between">
		<h1 class="h1">{search ? `Results for "${search}"` : 'Sauces'}</h1>

		<p class="text-gray-500">Showing {sauceCount} sauces</p>
	</div>

	{#if sauceCount === 0 && search}
		<p class="py-8 text-center text-gray-600">No sauces found matching "{search}"</p>
	{:else}
		<SauceGrid {sauces} section="all"></SauceGrid>
	{/if}

	<div class="flex flex-row justify-end gap-6 py-4">
		<a
			href={previousUrl}
			class={currentPage < 2 ? 'pointer-events-none cursor-not-allowed opacity-70' : ''}
		>
			Prev
		</a>

		<span>
			{currentPage} / {Math.ceil(sauceCount / pageSize)}
		</span>

		<a
			href={nextUrl}
			class={currentPage > Math.ceil(sauceCount / pageSize) - 1
				? 'pointer-events-none cursor-not-allowed opacity-70'
				: ''}
		>
			Next
		</a>
	</div>
</div>
