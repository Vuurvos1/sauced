<script lang="ts">
	import { enhance } from '$app/forms';
	import SauceGrid from '$lib/components/SauceGrid.svelte';

	let { data } = $props();

	let { recentSauces, topSauces, user } = $derived(data);
</script>

<div class="space-y-12">
	<section>
		<div class="container">
			<h2 class="h2 mb-4">Recently added sauces</h2>

			<SauceGrid sauces={recentSauces} />

			<div class="mt-4 flex justify-end">
				<a class="btn" href="/sauces">View all sauces</a>
			</div>
		</div>
	</section>

	<section>
		<div class="container">
			<h2 class="h2">Top rated sauces</h2>

			<SauceGrid sauces={topSauces} />

			<div class="mt-4 flex justify-end">
				<a class="btn" href="/sauces">View all sauces</a>
			</div>
		</div>
	</section>

	{#if user}
		<section class="py-6">
			<div class="container">
				<!-- TODO: add some sort of user following system with a timeline -->
				<h2 class="h2">Recent Activity</h2>

				<p>Not implemented yet :(</p>
			</div>
		</section>

		<section>
			<div class="container">
				<form method="post" action="/?/logout" use:enhance>
					<button>Logout</button>
				</form>
			</div>
		</section>
		<!-- Or do like a category browse thing, and trending sauces -->
	{/if}
</div>
