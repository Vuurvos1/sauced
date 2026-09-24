<script lang="ts">
	import SauceGrid from '$lib/components/SauceGrid.svelte';
	import Meta from '$lib/components/Meta.svelte';

	let { data } = $props();

	let { username, sauces } = $derived(data);
</script>

<Meta
	title={`${username}'s wishlist`}
	description={`The hot sauces ${username} wants to try.`}
	noindex
/>

<div>
	<section class="container">
		<a href="../">Back</a>

		<h1 class="text-4xl font-semibold">Wishlist</h1>

		{#if sauces && sauces.length > 0}
			<!-- TODO: make custom wishlist grid -->
			<SauceGrid {sauces} section="wishlist"></SauceGrid>
		{:else}
			<p>No sauces found</p>
		{/if}
	</section>
</div>
