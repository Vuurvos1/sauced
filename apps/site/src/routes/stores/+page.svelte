<script lang="ts">
	import { Globe, ArrowUpRight } from '@o7/icon/lucide';
	import Meta from '$lib/components/Meta.svelte';

	let { data } = $props();

	let { stores, search } = $derived(data);
</script>

<Meta
	title={search ? `Stores matching "${search}"` : 'Hot sauce stores'}
	description="Where to get your favourite hot sauces: every store Sauced tracks stock from."
	canonical="/stores"
	noindex={!!search}
/>

<section>
	<hgroup class="container flex flex-col items-center gap-2 pb-6">
		<h1 class="h1 mb-4">Hot Sauce Stores</h1>
		<p class="mb-6 text-gray-600">
			{#if search}
				{stores.length}
				{stores.length === 1 ? 'store' : 'stores'} matching "{search}"
			{:else}
				Where to get your favorite hot sauces
			{/if}
		</p>
	</hgroup>
</section>

<section>
	<div class="container">
		{#if search && stores.length === 0}
			<p class="text-center text-gray-600">No stores found matching "{search}"</p>
		{/if}

		<ul class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each stores as store}
				<li
					class="group relative flex flex-col items-center gap-4 rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
				>
					<a href={`/stores/${store.name}`} class="flex w-full flex-col items-center gap-4">
						<div class="flex h-32 items-center justify-center rounded-md p-4">
							<img
								src={`/assets/stores/${store.name.toLowerCase().replaceAll(' ', '-')}.png`}
								alt={store.name}
								class="aspect-[3/2] h-auto w-full object-contain"
							/>
						</div>

						<span class="text-lg font-medium text-gray-900">{store.name}</span>
					</a>

					<a
						href={store.url}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-primary-600 inline-flex items-center gap-1.5 text-sm text-gray-600"
					>
						<Globe size={16} />
						<span>Visit Store</span>
						<ArrowUpRight size={14} class="text-gray-400" />
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
