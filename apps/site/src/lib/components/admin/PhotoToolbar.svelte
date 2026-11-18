<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SauceEditorImage } from '#lib/server/sauce-editor.js';
	import { adminAction, stayHere } from './stay.js';

	interface Props {
		slug: string;
		image: SauceEditorImage;
		/** Photos visitors can see; the last one can't be hidden. */
		visibleCount: number;
		canEdit: boolean;
		onCover: () => void;
		onError: (message: string) => void;
	}

	let { slug, image, visibleCount, canEdit, onCover, onError }: Props = $props();
	const stay = $derived(stayHere(onError));
	const lastPhoto = $derived(!image.hidden && !image.pending && visibleCount <= 1);
</script>

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

<div class="mt-auto flex flex-wrap items-center gap-1 text-sm">
	{#if image.pending}
		<form method="post" action={adminAction(slug, 'show')} use:enhance={stay}>
			<input type="hidden" name="imageId" value={image.imageId} />
			<button class="btn px-2 py-1 text-sm">Accept</button>
		</form>
		<form method="post" action={adminAction(slug, 'hide')} use:enhance={stay}>
			<input type="hidden" name="imageId" value={image.imageId} />
			<button class="btn btn-outline px-2 py-1 text-sm">Reject</button>
		</form>
	{:else if image.hidden}
		<form method="post" action={adminAction(slug, 'show')} use:enhance={stay}>
			<input type="hidden" name="imageId" value={image.imageId} />
			<button class="btn btn-outline px-2 py-1 text-sm">Show</button>
		</form>
	{:else}
		{#if image.pinned}
			<form method="post" action={adminAction(slug, 'unpin')} use:enhance={stay}>
				<input type="hidden" name="imageId" value={image.imageId} />
				<button class="btn btn-outline px-2 py-1 text-sm">Unpin</button>
			</form>
		{:else if !image.main}
			<form method="post" action={adminAction(slug, 'pin')} use:enhance={stay}>
				<input type="hidden" name="imageId" value={image.imageId} />
				<button class="btn btn-outline px-2 py-1 text-sm">Make main</button>
			</form>
		{/if}
		<form method="post" action={adminAction(slug, 'hide')} use:enhance={stay}>
			<input type="hidden" name="imageId" value={image.imageId} />
			<button
				class="btn btn-outline px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
				disabled={lastPhoto}
				title={lastPhoto ? 'The only photo can’t be hidden; hide the sauce instead' : undefined}
				>Hide</button
			>
		</form>
	{/if}

	{#if canEdit && image.originalKey}
		<button type="button" class="btn btn-outline px-2 py-1 text-sm" onclick={onCover}>
			{image.edits ? 'Edit boxes' : 'Cover…'}
		</button>
	{/if}
	{#if image.edits}
		<form method="post" action={adminAction(slug, 'unedit')} use:enhance={stay}>
			<input type="hidden" name="imageId" value={image.imageId} />
			<button class="btn btn-outline px-2 py-1 text-sm">Undo edit</button>
		</form>
	{/if}
</div>
