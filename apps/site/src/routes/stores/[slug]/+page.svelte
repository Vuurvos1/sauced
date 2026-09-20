<script lang="ts">
	import SauceGrid from '$lib/components/SauceGrid.svelte';
	import { Globe, ArrowUpRight } from '@o7/icon/lucide';

	let { data } = $props();

	let { store, sauces } = $derived(data);

	const gridSauces = $derived(sauces.map((sauce) => sauce.sauce));
</script>

<section>
	<div class="container flex flex-col items-center gap-2 pb-6">
		<img
			src={`/assets/stores/${store.name.toLowerCase().replaceAll(' ', '-')}.png`}
			alt={store.name}
			class="aspect-[3/2] h-32 w-auto object-contain"
		/>

		<!-- <h1 class="h1 mb-6 text-center">
			<a href={store.url}>{store.name}</a>
		</h1> -->

		<p>{store.description}</p>

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
	</div>
</section>

<section>
	<div class="container">
		<!-- <h2 class="h2 mb-4">Their Sauces</h2> -->

		<SauceGrid sauces={gridSauces} section="store"></SauceGrid>
	</div>
</section>
