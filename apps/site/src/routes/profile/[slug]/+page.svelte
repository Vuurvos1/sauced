<script lang="ts">
	import { BeamAvatar } from '@app/boring-avatars';
	import { page } from '$app/state';
	import { Trash2, Settings } from '@o7/icon/lucide';
	import { enhance } from '$app/forms';
	import StarRating from '$lib/components/StarRating.svelte';
	import { formatTimeAgo } from '$lib/utils/time.js';

	let { data } = $props();

	let { user, session, checkedSauces, reviewCount, sauceTriedCount } = $derived(data);
</script>

<div class="container grid gap-6 md:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_3fr]">
	<div class="space-y-4">
		<section class="card flex h-fit flex-col">
			<div class="flex flex-col items-center gap-4">
				<BeamAvatar size={96} name={user.username}></BeamAvatar>

				<h1 class="mb-3 text-2xl font-bold">{user.username}</h1>

				<!-- <a href={`/profile/${page.params.slug}/wishlist`}>wishlist</a> -->

				<!-- {#if session?.userId === user.id}

			{/if} -->
			</div>

			{#if session?.userId === user.id}
				<a class="btn btn-outline px-4 py-1" href={`/settings`}>
					<Settings size={20}></Settings>
					Edit profile
				</a>
			{/if}
		</section>

		<section class="card">
			<h2 class="h2 mb-5">Stats</h2>

			<div class="gap-4 space-y-4 text-center">
				<div class="flex justify-between">
					<span class=" text-sm text-gray-500">Check ins</span>
					<span class="font-medium">{sauceTriedCount}</span>
				</div>
				<div class="flex justify-between">
					<span class=" text-sm text-gray-500">Reviews</span>
					<span class="font-medium">{reviewCount}</span>
				</div>
			</div>
		</section>
	</div>

	<div>
		<section>
			<div>
				<h2 class="h3 mb-4">Check-ins</h2>

				{#if checkedSauces.length > 0}
					<ul class="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-4">
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

								<a class="card block h-full" href={`/sauces/${sauce.slug}`}>
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

									{#if sauce.review}
										<p class="mt-3 text-sm text-gray-500">
											{sauce.review}
										</p>
									{/if}

									<p class="mt-2 text-sm text-gray-500">
										Reviewed {formatTimeAgo(sauce.checkedAt)}
									</p>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p>No check-ins yet.</p>
				{/if}
			</div>
		</section>
		<!-- 
		<section></section>

		<section></section>

		<section></section> -->
	</div>
</div>
