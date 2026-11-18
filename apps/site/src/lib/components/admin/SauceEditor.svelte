<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { sauceImageSrc } from '#lib/images.js';
	import type { SauceEditorImage } from '#lib/server/sauce-editor.js';
	import MaskEditor from './MaskEditor.svelte';

	interface Props {
		sauce: {
			slug: string;
			name: string;
			description: string | null;
			reviewedAt: Date | null;
			hiddenAt: Date | null;
		};
		images: SauceEditorImage[];
		canEdit: boolean;
		/**
		 * On the public sauce page: actions stay on the page instead of moving on to
		 * the next sauce to review.
		 */
		inline?: boolean;
	}

	let { sauce, images, canEdit, inline = false }: Props = $props();

	// The actions live on the admin route, so this works from any page.
	const action = (name: string) => `/admin/sauces/${encodeURIComponent(sauce.slug)}?/${name}`;
	let problem = $state('');

	/**
	 * SvelteKit's default would navigate to the admin route that owns the action,
	 * taking the editor off the sauce page. Refresh the page we're on instead; only a
	 * redirect (on to the next sauce) is left to the default.
	 */
	const stay: SubmitFunction = () => {
		problem = '';
		return async ({ result, update }) => {
			if (result.type === 'success' || result.type === 'failure') {
				if (result.type === 'failure') problem = String(result.data?.error ?? 'That didn’t work');
				await invalidateAll();
			} else {
				await update();
			}
		};
	};

	// Mirrors the server: the last photo visitors see can't be hidden.
	const visibleCount = $derived(images.filter((image) => !image.hidden && !image.pending).length);

	let editing = $state<SauceEditorImage | null>(null);
	let editorOpen = $state(false);

	function edit(image: SauceEditorImage) {
		editing = image;
		editorOpen = true;
	}
</script>

<div class="mb-6 flex flex-wrap items-center gap-2">
	{#if sauce.hiddenAt}
		<p class="mr-2 font-medium text-red-700">
			Hidden from the site since {sauce.hiddenAt.toLocaleDateString()}
		</p>
		<form method="post" action={action('showSauce')} use:enhance={stay}>
			<button class="btn btn-outline">Put back on the site</button>
		</form>
	{:else}
		{#if sauce.reviewedAt}
			<p class="mr-2 text-sm font-medium text-green-700">
				Reviewed {sauce.reviewedAt.toLocaleDateString()} · locked against the scraper
			</p>
			<form method="post" action={action('unreview')} use:enhance={stay}>
				<button class="btn btn-outline">Unlock</button>
			</form>
		{:else if inline}
			<form method="post" action={action('review')} use:enhance={stay}>
				<input type="hidden" name="stay" value="1" />
				<button class="btn">Mark reviewed</button>
			</form>
		{/if}
		<form method="post" action={action('hideSauce')} use:enhance={stay}>
			{#if inline}<input type="hidden" name="stay" value="1" />{/if}
			<button class="btn btn-danger">Hide sauce</button>
		</form>
	{/if}
</div>

{#if problem}<p class="mb-4 text-red-600" role="alert">{problem}</p>{/if}

<h2 class="h3 mb-3">Photos</h2>
{#if images.length === 0}
	<p class="mb-8 text-gray-600">No photos.</p>
{:else}
	<ul class="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
		{#each images as image (image.imageId)}
			<li
				class={[
					'flex flex-col rounded-md border p-2',
					image.main ? 'border-black' : 'border-gray-200',
					(image.hidden || image.duplicate) && 'opacity-50'
				]}
			>
				<img
					class="mb-2 aspect-square w-full object-contain"
					src={sauceImageSrc(image, 400)}
					alt=""
					loading="lazy"
				/>
				<div class="mb-2 flex flex-wrap gap-1 text-xs">
					{#if image.main}<span class="rounded bg-black px-1.5 py-0.5 text-white">Main</span>{/if}
					{#if image.pinned}<span class="rounded bg-gray-200 px-1.5 py-0.5">Pinned</span>{/if}
					{#if image.pending}
						<span class="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">New</span>
					{/if}
					{#if image.hidden}<span class="rounded bg-gray-200 px-1.5 py-0.5">Hidden</span>{/if}
					{#if image.duplicate}
						<span class="rounded bg-gray-200 px-1.5 py-0.5">Copy of another photo</span>
					{/if}
					{#if image.edits}
						<span class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">Edited</span>
					{/if}
					{#if !image.originalKey}
						<span class="rounded bg-red-100 px-1.5 py-0.5 text-red-800">Not uploaded</span>
					{/if}
				</div>
				<p class="mb-2 text-xs text-gray-500">{image.storeName ?? 'Unknown shop'}</p>

				<div class="mt-auto flex flex-wrap gap-1 text-sm">
					{#if image.pending}
						<form method="post" action={action('show')} use:enhance={stay}>
							<input type="hidden" name="imageId" value={image.imageId} />
							<button class="btn px-2 py-1 text-sm">Accept</button>
						</form>
						<form method="post" action={action('hide')} use:enhance={stay}>
							<input type="hidden" name="imageId" value={image.imageId} />
							<button class="btn btn-outline px-2 py-1 text-sm">Reject</button>
						</form>
					{:else if image.hidden}
						<form method="post" action={action('show')} use:enhance={stay}>
							<input type="hidden" name="imageId" value={image.imageId} />
							<button class="btn btn-outline px-2 py-1 text-sm">Show</button>
						</form>
					{:else}
						<form method="post" action={action('hide')} use:enhance={stay}>
							<input type="hidden" name="imageId" value={image.imageId} />
							<button
								class="btn btn-outline px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
								disabled={visibleCount <= 1}
								title={visibleCount <= 1
									? 'The only photo can’t be hidden; hide the sauce instead'
									: undefined}>Hide</button
							>
						</form>
						{#if image.pinned}
							<form method="post" action={action('unpin')} use:enhance={stay}>
								<input type="hidden" name="imageId" value={image.imageId} />
								<button class="btn btn-outline px-2 py-1 text-sm">Unpin</button>
							</form>
						{:else if !image.main}
							<form method="post" action={action('pin')} use:enhance={stay}>
								<input type="hidden" name="imageId" value={image.imageId} />
								<button class="btn btn-outline px-2 py-1 text-sm">Make main</button>
							</form>
						{/if}
					{/if}
					{#if canEdit && image.originalKey}
						<button
							type="button"
							class="btn btn-outline px-2 py-1 text-sm"
							onclick={() => edit(image)}
						>
							{image.edits ? 'Edit boxes' : 'Cover…'}
						</button>
					{/if}
					{#if image.edits}
						<form method="post" action={action('unedit')} use:enhance={stay}>
							<input type="hidden" name="imageId" value={image.imageId} />
							<button class="btn btn-outline px-2 py-1 text-sm">Undo edit</button>
						</form>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<h2 class="h3 mb-3">Details</h2>
<form method="post" action={action('details')} use:enhance={stay} class="grid max-w-2xl gap-3">
	<label class="grid gap-1">
		<span class="label">Name</span>
		<input
			class="rounded border border-gray-300 px-3 py-2"
			name="name"
			value={sauce.name}
			required
		/>
	</label>
	<label class="grid gap-1">
		<span class="label">Description</span>
		<textarea class="min-h-32 rounded border border-gray-300 px-3 py-2" name="description"
			>{sauce.description ?? ''}</textarea
		>
	</label>
	<div><button class="btn btn-outline">Save details</button></div>
</form>

{#if editing}
	<MaskEditor
		bind:open={editorOpen}
		slug={sauce.slug}
		imageId={editing.imageId}
		masks={editing.edits?.masks ?? []}
	/>
{/if}
