<script lang="ts">
	import { page } from '$app/state';
	import SauceGrid from '$lib/components/SauceGrid.svelte';

	let { data } = $props();

	let { sauces, sauceCount, pageSize } = $derived(data);

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
		<h1 class="h1">Sauces</h1>

		<p class="text-gray-500">Showing {sauceCount} sauces</p>
	</div>

	<SauceGrid {sauces}></SauceGrid>

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
