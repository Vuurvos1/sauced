<script lang="ts">
	import { sauceImageAttrs, sauceImageSrc, showPlaceholder } from '#lib/images.js';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { BeamAvatar } from '@app/boring-avatars';
	import dayjs from '#lib/dayjs.js';
	import StarRating from '#lib/components/StarRating.svelte';
	import StarRater from '#lib/components/StarRater.svelte';
	import { ListPlus, ListMinus, Check, ArrowUpRight, Trash2 } from '@o7/icon/lucide';
	import { Dialog } from '#lib/components/dialog/index.js';
	import Meta from '#lib/components/Meta.svelte';
	import { toast } from 'svelte-sonner';
	import { reviewSchema, REVIEW_MAX_LENGTH } from '#lib/validation/index.js';
	import { getUserCheckin, removeCheckin, upsertReview } from './data.remote';
	import { ChevronRight } from '@o7/icon/lucide';
	import AdminBar from '#lib/components/admin/AdminBar.svelte';
	import PhotoToolbar from '#lib/components/admin/PhotoToolbar.svelte';
	import MaskEditor from '#lib/components/admin/MaskEditor.svelte';
	import { dialogOpen, isTyping } from '#lib/utils/keyboard.js';
	import type { SauceEditorImage } from '#lib/server/sauce-editor.js';

	let { data, form } = $props();

	let { sauce, images, maker, session, user, wishlisted, stores } = $derived(data);

	// Edit mode is in the URL (?edit), so the review queue can link straight into it;
	// the server only sends the editor's data then, and only to admins.
	const editor = $derived(data.editor);
	const editing = $derived(Boolean(editor));

	type Photo = {
		id: string;
		imageKey: string | null;
		imageUrl: string | null;
		admin?: SauceEditorImage;
	};
	/** Visitors' photos, or in edit mode every photo with what an admin needs to know. */
	const gallery: Photo[] = $derived(
		editing && editor
			? editor.images.map((image) => ({
					id: image.imageId,
					imageKey: image.imageKey,
					imageUrl: image.imageUrl,
					admin: image
				}))
			: images.map((image) => ({ id: image.imageKey ?? image.imageUrl ?? '', ...image }))
	);

	// By photo, not position: pinning reorders the list, and the photo you acted on
	// should stay in view. Keyed to the sauce, so another sauce starts on its main image.
	let selection = $state<{ sauceId: string; id: string }>();
	const selected = $derived(
		Math.max(
			0,
			gallery.findIndex(
				(photo) => selection?.sauceId === sauce.sauceId && photo.id === selection.id
			)
		)
	);
	const shown: Photo = $derived(gallery[selected] ?? { id: '', imageKey: null, imageUrl: null });

	function select(index: number) {
		const count = gallery.length;
		if (count === 0) return;
		selection = { sauceId: sauce.sauceId, id: gallery[(index + count) % count].id };
	}

	function arrowKeys(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey || gallery.length < 2) return;
		if (isTyping(event) || dialogOpen()) return;
		if (event.key === 'ArrowLeft') select(selected - 1);
		if (event.key === 'ArrowRight') select(selected + 1);
	}

	/** A horizontal swipe on the main photo steps through the gallery. */
	let swipeStart: { x: number; y: number } | null = null;
	function swipeDown(event: PointerEvent) {
		// The arrows and the edit toolbar handle their own taps.
		if ((event.target as HTMLElement).closest('button, a, form')) return;
		swipeStart = { x: event.clientX, y: event.clientY };
	}
	function swipeUp(event: PointerEvent) {
		if (!swipeStart) return;
		const dx = event.clientX - swipeStart.x;
		const dy = event.clientY - swipeStart.y;
		swipeStart = null;
		// Far enough to be meant, and more sideways than down, so scrolling still works.
		if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) select(selected + (dx < 0 ? 1 : -1));
	}

	const problem = $derived((form as { error?: string } | null)?.error);
	let detailsForm = $state<HTMLFormElement>();
	let covering = $state<SauceEditorImage | null>(null);
	let coverOpen = $state(false);

	const visibleCount = $derived(
		editor?.images.filter((image) => !image.hidden && !image.pending).length ?? 0
	);

	/** Escape puts back what was there instead of saving it. */
	function revertOnEscape(event: KeyboardEvent, original: string) {
		const field = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
		if (event.key === 'Escape') {
			field.value = original;
			field.blur();
		}
	}
	let checkins = $derived(data.checkins);
	let userCheckin = $derived(await getUserCheckin(sauce.sauceId));

	let open = $state(false);

	const byMaker = $derived(maker ? ` by ${maker.name}` : '');
</script>

<Meta
	title={sauce.name}
	description={sauce.description ||
		`Ratings, reviews and where to buy ${sauce.name}${byMaker} on Sauced.`}
	image={images[0] ? sauceImageSrc(images[0]) : undefined}
	imageAlt={sauce.name}
/>

<svelte:window onkeydown={arrowKeys} />

<div class="container">
	{#if data.isAdmin}
		<AdminBar {sauce} next={editor?.next ?? null} {editing} />
		{#if problem}<p class="mb-4 text-red-600" role="alert">{problem}</p>{/if}
	{/if}

	<section class="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<div class="xl:col-span-3">
			<div
				class="relative touch-pan-y select-none"
				role="group"
				aria-roledescription="carousel"
				aria-label="Photos of {sauce.name}"
				onpointerdown={swipeDown}
				onpointerup={swipeUp}
				onpointercancel={() => (swipeStart = null)}
			>
				<img
					draggable="false"
					class={[
						'sauce-hero aspect-square w-full object-contain',
						(shown.admin?.hidden || shown.admin?.duplicate) && 'opacity-50'
					]}
					{...sauceImageAttrs(shown)}
					sizes="(min-width: 1280px) 60vw, (min-width: 768px) 50vw, 100vw"
					alt={sauce.name}
				/>

				{#if gallery.length > 1}
					<button
						type="button"
						class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
						aria-label="Previous photo"
						onclick={() => select(selected - 1)}
					>
						<ChevronRight class="rotate-180" size={24}></ChevronRight>
					</button>
					<button
						type="button"
						class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
						aria-label="Next photo"
						onclick={() => select(selected + 1)}
					>
						<ChevronRight size={24}></ChevronRight>
					</button>
				{/if}
			</div>

			{#if !editing && gallery.length > 1}
				<ul class="mt-3 flex gap-2 overflow-x-auto pt-1" aria-label="Photos">
					{#each gallery as photo, index (photo.id)}
						<li class="relative shrink-0">
							<button
								type="button"
								class={[
									'block size-16 rounded-md border-2 p-0.5 transition-colors',
									index === selected ? 'border-black' : 'border-transparent hover:border-gray-300',
									(photo.admin?.hidden || photo.admin?.duplicate) && 'opacity-40'
								]}
								aria-label={`Photo ${index + 1} of ${gallery.length}`}
								aria-pressed={index === selected}
								onclick={() => select(index)}
							>
								<img
									class="size-full object-contain"
									src={sauceImageSrc(photo, 400)}
									onerror={showPlaceholder}
									alt=""
									loading="lazy"
								/>
							</button>
							{#if photo.admin?.pending}
								<span
									class="pointer-events-none absolute -right-1 -top-1 rounded bg-amber-400 px-1 text-xs font-semibold"
									>New</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="xl:col-span-2">
			{#if editing}
				<!-- Name and description save together when either loses focus with a change. -->
				<form
					id="sauce-details"
					method="post"
					action="?/details&edit=1"
					use:enhance
					bind:this={detailsForm}
				>
					<h1 class="h1 mb-1">
						<span class="sr-only">{sauce.name}</span>
						<!-- A textarea so a long name wraps; Enter saves instead of breaking the line. -->
						<textarea
							class="block w-full resize-none rounded border border-dashed border-gray-300 px-1 [field-sizing:content] hover:border-gray-500 focus:border-solid focus:border-black focus:outline-none"
							name="name"
							rows="1"
							value={sauce.name}
							aria-label="Sauce name"
							required
							onchange={() => detailsForm?.requestSubmit()}
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									event.currentTarget.blur();
								}
								revertOnEscape(event, sauce.name);
							}}></textarea>
					</h1>
				</form>
			{:else}
				<h1 class="h1 mb-1">{sauce.name}</h1>
			{/if}

			{#if maker}
				<a
					class="mb-3 inline-block font-medium text-gray-600 underline-offset-2 hover:underline"
					href={resolve('/makers/[slug]', { slug: maker.slug })}
				>
					{maker.name}
				</a>
			{/if}

			{#if editing}
				<textarea
					form="sauce-details"
					class="mb-5 min-h-40 w-full rounded border border-dashed border-gray-300 p-1 text-gray-600 hover:border-gray-500 focus:border-solid focus:border-black focus:outline-none"
					name="description"
					aria-label="Description"
					onchange={() => detailsForm?.requestSubmit()}
					onkeydown={(event) => revertOnEscape(event, sauce.description ?? '')}
					>{sauce.description ?? ''}</textarea
				>
			{:else}
				<p class="mb-5 text-gray-500">{sauce.description}</p>
			{/if}

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
							upsertReview.fields.set({
								id: sauce.sauceId,
								rating: userCheckin ? String(userCheckin.rating) : '',
								content: userCheckin?.review ?? ''
							});
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
								<StarRater field={upsertReview.fields.rating}></StarRater>

								<label for="content">Review</label>
								<textarea
									{...upsertReview.fields.content.as('text')}
									id="content"
									class="resize-none rounded border p-2"
									placeholder="What do you think about this sauce?"
									rows="4"
									maxlength={REVIEW_MAX_LENGTH}></textarea>
							</div>

							{#each upsertReview.fields.allIssues() ?? [] as issue, i (i)}
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
						{#each stores as store (store.store.storeId)}
							<li>
								<a
									class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors hover:bg-gray-50"
									target="_blank"
									rel="external noopener noreferrer"
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

	{#if editing && editor}
		<!-- Every photo side by side, with what an admin can do to each. -->
		<section class="mb-12">
			<h2 class="h3 mb-3">Photos</h2>
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each gallery as photo, index (photo.id)}
					{#if photo.admin}
						{@const image = photo.admin}
						<li
							class={[
								'flex flex-col rounded-md border-2 p-2',
								index === selected ? 'border-black' : 'border-gray-200'
							]}
						>
							<button
								type="button"
								class={['mb-2 block', (image.hidden || image.duplicate) && 'opacity-50']}
								aria-label={`Show photo ${index + 1} above`}
								aria-pressed={index === selected}
								onclick={() => select(index)}
							>
								<img
									class="aspect-square w-full object-contain"
									src={sauceImageSrc(photo, 400)}
									onerror={showPlaceholder}
									alt=""
									loading="lazy"
								/>
							</button>
							<PhotoToolbar
								{image}
								{visibleCount}
								canEdit={editor.canEdit}
								onCover={() => {
									covering = image;
									coverOpen = true;
								}}
							/>
						</li>
					{/if}
				{/each}
			</ul>
		</section>
	{/if}

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
							<a href={resolve('/profile/[slug]', { slug: checkin.username })}>{checkin.username}</a
							>
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

				{#each checkins as checkin (checkin.checkins.userId)}
					{@render checkinSnippet(checkin)}
				{/each}
			</ul>
		{/if}
	</section>
</div>

{#if covering}
	<MaskEditor
		bind:open={coverOpen}
		imageId={covering.imageId}
		masks={covering.edits?.masks ?? []}
	/>
{/if}

<style>
	.sauce-hero {
		view-transition-name: sauce-image;
	}
</style>
