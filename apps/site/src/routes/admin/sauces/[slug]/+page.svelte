<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { sauceImageSrc } from '#lib/images.js';
	import Meta from '#lib/components/Meta.svelte';
	import MaskEditor from './MaskEditor.svelte';

	let { data, form } = $props();
	const { sauce, images, next, canEdit } = $derived(data);

	let reviewForm = $state<HTMLFormElement>();
	let editing = $state<{ imageId: string; masks: (typeof images)[number]['edits'] } | null>(null);
	let editorOpen = $state(false);

	const nextSlug = $derived(next);

	function shortcut(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (editorOpen || event.metaKey || event.ctrlKey || event.altKey) return;
		if (target.closest('input, textarea, select, [contenteditable]')) return;
		if (event.key === 'r' && !sauce.reviewedAt) reviewForm?.requestSubmit();
		if (event.key === 'n' && nextSlug) goto(resolve('/admin/sauces/[slug]', { slug: nextSlug }));
	}

	function edit(image: (typeof images)[number]) {
		editing = { imageId: image.imageId, masks: image.edits };
		editorOpen = true;
	}
</script>

<svelte:window onkeydown={shortcut} />

<Meta title={`Review ${sauce.name}`} description="Admin" />

<div class="container py-8">
	<a
		class="mb-4 inline-block text-sm text-gray-600 hover:underline"
		href={resolve('/admin/review')}
	>
		← All sauces to review
	</a>

	<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="h1">{sauce.name}</h1>
			<p class="text-gray-600">
				{sauce.makerName ?? 'No maker'} ·
				<a class="underline" href={resolve('/sauces/[slug]', { slug: sauce.slug })}>public page</a>
			</p>
			{#if sauce.reviewedAt}
				<p class="mt-1 text-sm font-medium text-green-700">
					Reviewed {sauce.reviewedAt.toLocaleDateString()} · locked against the scraper
				</p>
			{/if}
		</div>

		<div class="flex flex-wrap gap-2">
			{#if sauce.reviewedAt}
				<form method="post" action="?/unreview" use:enhance>
					<button class="btn btn-outline">Unlock</button>
				</form>
			{:else}
				<form method="post" action="?/review" use:enhance bind:this={reviewForm}>
					<button class="btn">Mark reviewed &amp; next <kbd class="opacity-60">R</kbd></button>
				</form>
			{/if}
			{#if nextSlug}
				<a class="btn btn-outline" href={resolve('/admin/sauces/[slug]', { slug: nextSlug })}
					>Skip <kbd class="opacity-60">N</kbd></a
				>
			{/if}
		</div>
	</div>

	{#if form?.error}<p class="mb-4 text-red-600" role="alert">{form.error}</p>{/if}

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
						{#if image.edits}<span class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800"
								>Edited</span
							>{/if}
						{#if !image.originalKey}
							<span class="rounded bg-red-100 px-1.5 py-0.5 text-red-800">Not uploaded</span>
						{/if}
					</div>
					<p class="mb-2 text-xs text-gray-500">{image.storeName ?? 'Unknown shop'}</p>

					<div class="mt-auto flex flex-wrap gap-1 text-sm">
						{#if image.pending}
							<form method="post" action="?/show" use:enhance>
								<input type="hidden" name="imageId" value={image.imageId} />
								<button class="btn px-2 py-1 text-sm">Accept</button>
							</form>
						{/if}
						{#if image.hidden || image.pending}
							{#if image.hidden}
								<form method="post" action="?/show" use:enhance>
									<input type="hidden" name="imageId" value={image.imageId} />
									<button class="btn btn-outline px-2 py-1 text-sm">Show</button>
								</form>
							{:else}
								<form method="post" action="?/hide" use:enhance>
									<input type="hidden" name="imageId" value={image.imageId} />
									<button class="btn btn-outline px-2 py-1 text-sm">Reject</button>
								</form>
							{/if}
						{:else}
							<form method="post" action="?/hide" use:enhance>
								<input type="hidden" name="imageId" value={image.imageId} />
								<button class="btn btn-outline px-2 py-1 text-sm">Hide</button>
							</form>
							{#if image.pinned}
								<form method="post" action="?/unpin" use:enhance>
									<input type="hidden" name="imageId" value={image.imageId} />
									<button class="btn btn-outline px-2 py-1 text-sm">Unpin</button>
								</form>
							{:else if !image.main}
								<form method="post" action="?/pin" use:enhance>
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
							<form method="post" action="?/unedit" use:enhance>
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
	<form method="post" action="?/details" use:enhance class="grid max-w-2xl gap-3">
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
</div>

{#if editing}
	<MaskEditor bind:open={editorOpen} imageId={editing.imageId} masks={editing.masks?.masks ?? []} />
{/if}
