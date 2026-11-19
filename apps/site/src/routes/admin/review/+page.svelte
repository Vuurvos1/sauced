<script lang="ts">
	import { resolve } from '$app/paths';
	import { sauceImageSrc, showPlaceholder } from '#lib/images.js';
	import Meta from '#lib/components/Meta.svelte';

	let { data } = $props();

	const tabs = [
		{ show: 'unreviewed', label: 'To review' },
		{ show: 'pending', label: 'New photos' },
		{ show: 'reviewed', label: 'Reviewed' },
		{ show: 'hidden', label: 'Hidden' }
	] as const;
</script>

<Meta title="Review sauces" description="Admin" />

<div class="container py-8">
	<h1 class="h1 mb-2">Review sauces</h1>
	<p class="mb-6 text-gray-600">
		A reviewed sauce is locked: scrapes keep its store links current but leave its name, description
		and photos alone. New photos for it wait under “New photos”.
	</p>

	<nav class="mb-6 flex gap-2" aria-label="Filter">
		{#each tabs as tab (tab.show)}
			<a
				href={resolve(`/admin/review?show=${tab.show}`)}
				class={['btn', tab.show === data.show ? '' : 'btn-outline']}
				aria-current={tab.show === data.show ? 'page' : undefined}
			>
				{tab.label}
				<span class="text-sm opacity-70">{data.totals[tab.show]}</span>
			</a>
		{/each}
	</nav>

	{#if data.sauces.length === 0}
		<p class="text-gray-600">Nothing here.</p>
	{:else}
		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
			{#each data.sauces as sauce (sauce.slug)}
				<li>
					<a
						class="block rounded-md border border-gray-200 p-2 hover:border-gray-400"
						href={resolve('/sauces/[slug]?edit=1', { slug: sauce.slug })}
					>
						<img
							class="mb-2 aspect-square w-full object-contain"
							src={sauceImageSrc(sauce, 400)}
							onerror={showPlaceholder}
							alt=""
							loading="lazy"
						/>
						<div class="line-clamp-2 font-medium">{sauce.name}</div>
						<div class="text-sm text-gray-600">{sauce.makerName ?? 'No maker'}</div>
						<div class="text-sm text-gray-500">
							{sauce.photos} photo{sauce.photos === 1 ? '' : 's'}
							{#if sauce.pendingPhotos > 0}
								· <span class="font-medium text-amber-700">{sauce.pendingPhotos} new</span>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>

		{#if data.pages > 1}
			<nav class="mt-8 flex items-center gap-4" aria-label="Pages">
				{#if data.page > 1}<a
						class="btn btn-outline"
						href={resolve(`/admin/review?show=${data.show}&page=${data.page - 1}`)}>Previous</a
					>{/if}
				<span class="text-gray-600">Page {data.page} of {data.pages}</span>
				{#if data.page < data.pages}<a
						class="btn btn-outline"
						href={resolve(`/admin/review?show=${data.show}&page=${data.page + 1}`)}>Next</a
					>{/if}
			</nav>
		{/if}
	{/if}
</div>
