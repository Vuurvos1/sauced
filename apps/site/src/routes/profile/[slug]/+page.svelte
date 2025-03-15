<script lang="ts">
	import { BeamAvatar } from '@app/boring-avatars';
	import { page } from '$app/state';
	import { Trash2 } from '@o7/icon/lucide';
	import { enhance } from '$app/forms';
	import StarRating from '$lib/components/StarRating.svelte';

	let { data } = $props();

	let { user, session, checkedSauces } = $derived(data);
</script>

<section class="pb-12">
	<div class="container flex flex-col items-center gap-4">
		<BeamAvatar size={128} name={user.username}></BeamAvatar>

		<h1 class="h1">{user.username}</h1>

		<a href={`/profile/${page.params.slug}/wishlist`}>wishlist</a>

		{#if session?.userId === user.id}
			<form method="post" action="/?/logout">
				<button type="submit">Logout</button>
			</form>
		{/if}
	</div>
</section>

<section>
	<div class="container">
		<h2 class="h2 mb-5">Check-ins</h2>

		{#if checkedSauces.length > 0}
			<ul class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each checkedSauces as sauce}
					<li class="group relative">
						<!-- TODO: add confirm dialog -->
						<form
							class="pointer-events-none absolute right-2 top-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
							method="post"
							action="?/removeCheckIn"
							use:enhance
						>
							<input type="hidden" name="sauceId" value={sauce.sauceId} />

							<button type="submit">
								<Trash2 size={24}></Trash2>
							</button>
						</form>

						<a href={`/sauces/${sauce.sauceId}`}>
							<img
								class="aspect-square w-full object-contain"
								src={sauce?.imageUrl}
								alt={sauce.name}
							/>

							<h3 class="h3 mb-2">
								{sauce.name}
							</h3>

							<div class="flex flex-row items-center gap-2">
								<StarRating rating={sauce.rating ?? 0} />
								({sauce.rating?.toFixed(1) ?? 'No ratings yet'})
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p>No check-ins yet.</p>
		{/if}
	</div>
</section>
