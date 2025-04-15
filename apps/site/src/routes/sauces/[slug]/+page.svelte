<script lang="ts">
	import { enhance } from '$app/forms';
	import { BeamAvatar } from '@app/boring-avatars';
	import dayjs from '$lib/dayjs';
	import StarRating from '$lib/components/StarRating.svelte';
	import StarRater from '$lib/components/StarRater.svelte';
	import { ListPlus, ListMinus, Check } from '@o7/icon/lucide';
	import { Dialog } from '$lib/components/dialog/index.js';

	let { data } = $props();

	let { sauce, session, user, wishlisted, stores } = $derived(data);
	let checkins = $state(data.checkins);
	let userCheckin = $state(data.userCheckin);

	let open = $state(false);
</script>

<div class="container">
	<section class="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<img class="aspect-square object-contain xl:col-span-3" src={sauce.imageUrl} alt={sauce.name} />

		<div class="xl:col-span-2">
			<h1 class="h1 mb-3">{sauce.name}</h1>

			<p class="mb-5 text-gray-500">{sauce.description}</p>

			{#if session}
				<div class="flex flex-row gap-6">
					<!-- TODO: error handle -->
					<form method="post" action="?/wishlist" use:enhance>
						<input type="hidden" name="id" value={sauce.sauceId} />

						<input type="hidden" name="wishlist" value={!wishlisted} />

						<button type="submit" class="btn">
							{#if wishlisted}
								<ListMinus size={20}></ListMinus>
							{:else}
								<ListPlus size={20}></ListPlus>
							{/if}
							{wishlisted ? 'Remove' : 'Add'} to Wishlist
						</button>
					</form>

					<!-- TODO: add shallow routing/non js option -->
					<button onclick={() => (open = !open)} type="submit" class="btn">
						<Check class={`${userCheckin ? 'text-green-500' : ''}`} size={20}></Check>
						{userCheckin ? 'Checked-in' : 'Check-in'}
					</button>

					<Dialog bind:open>
						<form
							method="post"
							action="?/review"
							use:enhance={({ formData }) => {
								if (!user) return () => {};

								const baseCheckin = { ...userCheckin };

								const newRating = Number(formData.get('rating'));
								const newReview = formData.get('content') as string;

								if (!userCheckin) {
									// @ts-expect-error - only needed fields
									userCheckin = {
										rating: newRating,
										review: newReview,
										updatedAt: new Date()
									};
								} else {
									userCheckin.rating = newRating;
									userCheckin.review = newReview;
								}

								open = false;

								return ({ result }) => {
									if (result.type !== 'success') {
										// reset
										console.error('Failed to submit review', result);
										// @ts-expect-error - copy of userCheckin
										userCheckin = baseCheckin;
									}
								};
							}}
						>
							<input type="hidden" name="id" value={sauce.sauceId} />

							<div class="mb-5 flex flex-col gap-4">
								<!-- rating slider -->
								<StarRater></StarRater>

								<!-- comment -->
								<label for="content">Review</label>
								<textarea
									class="resize-none rounded border p-2"
									name="content"
									placeholder="What do you think about this sauce?"
									rows="4"
								></textarea>
							</div>

							<div class="flex flex-row-reverse gap-4">
								<button type="submit" class="btn">Check-in</button>

								<button onclick={() => (open = false)} type="button" class="btn btn-outline">
									Cancel
								</button>
							</div>
						</form>
					</Dialog>
				</div>

				<!-- divider -->
				<div class="my-4 h-px w-full bg-gray-200"></div>
			{/if}

			<div class="mb-4">
				<h2 class="mb-2 text-xl font-semibold">Where to get</h2>
				{#if stores.length > 0}
					<ul class="flex flex-wrap gap-2">
						{#each stores as store}
							<li>
								<a
									class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors hover:bg-gray-50"
									target="_blank"
									rel="noopener noreferrer"
									href={store.url}
								>
									<span>{store.store.name}</span>
									<svg
										class="h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M7 17L17 7" />
										<path d="M7 7h10v10" />
									</svg>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-gray-500">No stores available at the moment.</p>
				{/if}
			</div>
		</div>
	</section>

	{#snippet checkinSnip(checkin: (typeof data.checkins)[number])}
		<li class="py-4 first:pt-0 last:pb-0">
			<div class="mb-3 flex flex-row items-center gap-4">
				<BeamAvatar name={checkin.username ?? ''}></BeamAvatar>

				<div class="flex flex-col">
					<time datetime={dayjs(checkin.checkins.updatedAt).format('YYYY-MM-DD')}>
						{dayjs(checkin.checkins.updatedAt).format('MMMM D, YYYY')}
					</time>
					{#if checkin.username}
						<a href={`/profile/${checkin.username}`}>{checkin.username}</a>
					{/if}
				</div>
			</div>

			<div class="mb-3 flex flex-row items-center gap-2">
				<StarRating rating={checkin.checkins?.rating ?? 0}></StarRating>

				<span class="ml-2">({checkin.checkins.rating?.toFixed(1) ?? '0.0'})</span>
			</div>

			<p>{checkin.checkins.review}</p>
		</li>
	{/snippet}

	<section>
		<h2 class="mb-4 text-3xl font-semibold">Reviews</h2>

		{#if checkins.length === 0 && !userCheckin}
			<p>No reviews yet.</p>
		{:else}
			<ul class="flex flex-col divide-y">
				{#if userCheckin && user}
					{@render checkinSnip({ username: user.username, checkins: userCheckin })}
				{/if}

				{#each checkins as checkin}
					{@render checkinSnip(checkin)}
				{/each}
			</ul>
		{/if}
	</section>
</div>
