<script lang="ts">
	import SauceGrid from '$lib/components/SauceGrid.svelte';

	let { data } = $props();

	let { sauces } = $derived(data);
</script>

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
