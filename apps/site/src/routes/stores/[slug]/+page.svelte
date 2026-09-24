<script lang="ts">
	import SauceGrid from '$lib/components/SauceGrid.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import { Globe, ArrowUpRight } from '@o7/icon/lucide';

	let { data } = $props();

	let { store, sauces } = $derived(data);

	const gridSauces = $derived(sauces.map((row) => ({ ...row.sauce, makerName: row.makerName })));

	const logo = $derived(`/assets/stores/${store.name.toLowerCase().replaceAll(' ', '-')}.png`);
</script>

<Meta
	title={store.name}
	description={store.description || `The hot sauces ${store.name} stocks, rated on Sauced.`}
	image={logo}
	imageAlt={store.name}
/>

<section>
	<div class="container flex flex-col items-center gap-2 pb-6">
		<img src={logo} alt={store.name} class="aspect-[3/2] h-32 w-auto object-contain" />

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
