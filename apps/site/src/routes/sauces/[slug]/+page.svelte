<script lang="ts">
	import { enhance } from '$app/forms';
	import { BeamAvatar } from '@app/boring-avatars';
	import dayjs from '$lib/dayjs';
	import StarRating from '$lib/components/StarRating.svelte';
	import StarRater from '$lib/components/StarRater.svelte';
	import { ListPlus, ListMinus, Check, ArrowUpRight, Trash2 } from '@o7/icon/lucide';
	import { Dialog } from '$lib/components/dialog/index.js';
	import Meta from '$lib/components/Meta.svelte';
	import { toast } from 'svelte-sonner';
	import { reviewSchema, REVIEW_MAX_LENGTH } from '$lib/validation';
	import { getUserCheckin, removeCheckin, upsertReview } from './data.remote';

	let { data } = $props();

	let { sauce, maker, session, user, wishlisted, stores } = $derived(data);
	let checkins = $derived(data.checkins);
	let userCheckin = $derived(await getUserCheckin(sauce.sauceId));

	let open = $state(false);

	const byMaker = $derived(maker ? ` by ${maker.name}` : '');
</script>

<Meta
	title={sauce.name}
	description={sauce.description ||
		`Ratings, reviews and where to buy ${sauce.name}${byMaker} on Sauced.`}
	image={sauce.imageUrl}
	imageAlt={sauce.name}
/>

<div class="container">
	<section class="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<img
			class="sauce-hero aspect-square object-contain xl:col-span-3"
			src={sauce.imageUrl}
			alt={sauce.name}
		/>

		<div class="xl:col-span-2">
			<h1 class="h1 mb-1">{sauce.name}</h1>

			{#if maker}
				<a
					class="mb-3 inline-block font-medium text-gray-600 underline-offset-2 hover:underline"
					href="/makers/{maker.slug}"
				>
					{maker.name}
				</a>
			{/if}

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
					<button
						onclick={() => {
							upsertReview.fields.set({ id: sauce.sauceId, content: userCheckin?.review ?? '' });
							open = true;
						}}
						type="button"
						class="btn"
					>
						<Check class={`${userCheckin ? 'text-green-500' : ''}`} size={20}></Check>
						{userCheckin ? 'Checked-in' : 'Check-in'}
					</button>

					<Dialog title="Check-in" bind:open>
						<form
							{...upsertReview.preflight(reviewSchema).enhance(async ({ fields, submit }) => {
								const { rating, content } = fields.value();
								try {
									const ok = await submit().updates(
										getUserCheckin(sauce.sauceId).withOverride((current) => ({
											// A first check-in has no row yet; the page only reads these fields
											...current!,
											rating: Number(rating),
											review: content ?? '',
											updatedAt: new Date()
										}))
									);
									if (ok) {
										open = false;
										toast.success('Check-in submitted successfully');
									}
								} catch {
									toast.error('Failed to save check-in');
								}
							})}
						>
							<input {...upsertReview.fields.id.as('hidden', sauce.sauceId)} />

							<div class="mb-5 flex flex-col gap-4">
								<StarRater rating={userCheckin?.rating ?? 0}></StarRater>

								<label for="content">Review</label>
								<textarea
									{...upsertReview.fields.content.as('text')}
									id="content"
									class="resize-none rounded border p-2"
									placeholder="What do you think about this sauce?"
									rows="4"
									maxlength={REVIEW_MAX_LENGTH}></textarea>
							</div>

							{#each upsertReview.fields.allIssues() ?? [] as issue}
								<div class="mb-6 rounded bg-red-50 p-3 text-sm text-red-600">
									{issue.message}
								</div>
							{/each}

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
									<ArrowUpRight size={20}></ArrowUpRight>
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

	{#snippet checkinSnippet(checkin: (typeof data.checkins)[number])}
		<li class="py-4 first:pt-0 last:pb-0">
			<div class="mb-3 flex flex-row items-center justify-between">
				<div class="flex flex-row items-center gap-4">
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

				{#if user && checkin.username === user.username}
					<form
						{...removeCheckin.enhance(async ({ submit }) => {
							try {
								await submit().updates(getUserCheckin(sauce.sauceId).withOverride(() => null));
								toast.success('Check-in removed successfully');
							} catch {
								toast.error('Failed to remove check-in');
							}
						})}
					>
						<input {...removeCheckin.fields.id.as('hidden', sauce.sauceId)} />
						<button
							type="submit"
							class="text-gray-400 transition-colors hover:text-red-600"
							title="Remove review"
						>
							<Trash2 size={16}></Trash2>
						</button>
					</form>
				{/if}
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
					{@render checkinSnippet({ username: user.username, checkins: userCheckin })}
				{/if}

				{#each checkins as checkin}
					{@render checkinSnippet(checkin)}
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.sauce-hero {
		view-transition-name: sauce-image;
	}
</style>
