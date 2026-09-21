<script lang="ts">
	import SauceGrid from '$lib/components/SauceGrid.svelte';
	import { Globe, ArrowUpRight } from '@o7/icon/lucide';

	let { data } = $props();

	let { maker, sauces } = $derived(data);
</script>

<svelte:head>
	<title>{maker.name} — sauces</title>
</svelte:head>

<section>
	<div class="container flex flex-col items-center gap-2 pb-6">
		<h1 class="h1 text-center">{maker.name}</h1>

		{#if maker.description}
			<p class="max-w-prose text-center text-gray-600">{maker.description}</p>
		{/if}

		{#if maker.website}
			<a
				href={maker.website}
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-primary-600 inline-flex items-center gap-1.5 text-sm text-gray-600"
			>
				<Globe size={16} />
				<span>Visit site</span>
				<ArrowUpRight size={14} class="text-gray-400" />
			</a>
		{/if}

		<p class="text-sm text-gray-500">
			{sauces.length}
			{sauces.length === 1 ? 'sauce' : 'sauces'}
		</p>
	</div>
</section>

<section>
	<div class="container">
		{#if sauces.length > 0}
			<SauceGrid {sauces} section="maker"></SauceGrid>
		{:else}
			<p class="text-gray-500">No sauces from this maker yet.</p>
		{/if}
	</div>
</section>
