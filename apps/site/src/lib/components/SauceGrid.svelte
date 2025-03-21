<script lang="ts">
	import type { HotSauce } from '@app/db/types';
	import StarRating from './StarRating.svelte';

	type SauceRating = HotSauce & { avgRating?: string | number | null };

	interface Props {
		sauces: SauceRating[];
	}

	const { sauces = [] }: Props = $props();
</script>

{#snippet sauce(sauce: SauceRating)}
	<li>
		<!-- TODO: make relative? -->
		<a href="/sauces/{sauce.slug}">
			<img
				class="mx-auto mb-3 aspect-square max-w-72 object-contain sm:max-w-full"
				src={sauce.imageUrl}
				alt={sauce.name}
			/>
			<h2 class="mb-2 text-xl font-semibold">{sauce.name}</h2>

			<div class="mb-2 flex flex-row items-center gap-3">
				{#if sauce.avgRating}
					{@const rating = Number(sauce.avgRating)}

					<StarRating {rating} />
					({rating.toFixed(1)})
				{:else}
					<p class="font-medium italic text-gray-500">No ratings yet</p>
				{/if}
			</div>

			<p class="line-clamp-3">{sauce.description}</p>
		</a>
	</li>
{/snippet}

<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-4 gap-y-8">
	{#each sauces as s}
		{@render sauce(s)}
	{:else}
		<li>No sauces found</li>
	{/each}
</ul>
