<script lang="ts">
	import Meta from '$lib/components/Meta.svelte';

	let { data } = $props();

	let { makers, search } = $derived(data);
</script>

<Meta
	title={search ? `Makers matching "${search}"` : 'Hot sauce makers'}
	description="The brands behind the bottles: every hot sauce maker on Sauced, and what they make."
	canonical="/makers"
	noindex={!!search}
/>

<section>
	<hgroup class="container flex flex-col items-center gap-2 pb-6">
		<h1 class="h1 mb-4">Hot Sauce Makers</h1>
		<p class="mb-6 text-gray-600">
			{#if search}
				{makers.length}
				{makers.length === 1 ? 'maker' : 'makers'} matching "{search}"
			{:else}
				The brands behind the bottles
			{/if}
		</p>
	</hgroup>
</section>

<section>
	<div class="container">
		{#if makers.length === 0}
			<p class="text-center text-gray-600">
				{search ? `No makers found matching "${search}"` : 'No makers yet'}
			</p>
		{/if}

		<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each makers as maker}
				<li
					class="rounded-lg border bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md"
				>
					<a class="flex flex-col gap-1 p-4" href={`/makers/${maker.slug}`}>
						<span class="font-medium">{maker.name}</span>
						<span class="text-sm text-gray-500">
							{maker.sauceCount}
							{maker.sauceCount === 1 ? 'sauce' : 'sauces'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
