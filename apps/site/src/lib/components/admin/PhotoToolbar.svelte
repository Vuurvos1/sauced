<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SauceEditorImage } from '#lib/server/sauce-editor.js';

	interface Props {
		image: SauceEditorImage;
		/** Photos visitors can see; the last one can't be hidden. */
		visibleCount: number;
		canEdit: boolean;
		onCover: () => void;
	}

	let { image, visibleCount, canEdit, onCover }: Props = $props();
	const lastPhoto = $derived(!image.hidden && !image.pending && visibleCount <= 1);
</script>

<!-- One of the sauce page's photo actions, applied to this photo. -->
{#snippet photoAction(action: string, label: string, primary = false, disabledTitle?: string)}
	<!-- `edit=1` rides along: the action's URL replaces the page's query, and the
	     page reloads its editor data only in edit mode. -->
	<form method="post" action={`?/${action}&edit=1`} use:enhance>
		<input type="hidden" name="imageId" value={image.imageId} />
		<button
			class={[
				'btn px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40',
				!primary && 'btn-outline'
			]}
			disabled={Boolean(disabledTitle)}
			title={disabledTitle}>{label}</button
		>
	</form>
{/snippet}

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
		{@render photoAction('show', 'Accept', true)}
		{@render photoAction('hide', 'Reject')}
	{:else if image.hidden}
		{@render photoAction('show', 'Show')}
	{:else}
		{#if image.pinned}
			{@render photoAction('unpin', 'Unpin')}
		{:else if !image.main}
			{@render photoAction('pin', 'Make main')}
		{/if}
		{@render photoAction(
			'hide',
			'Hide',
			false,
			lastPhoto ? 'The only photo can’t be hidden; hide the sauce instead' : undefined
		)}
	{/if}
	{#if canEdit && image.originalKey}
		<button type="button" class="btn btn-outline px-2 py-1 text-sm" onclick={onCover}>
			{image.edits ? 'Edit boxes' : 'Cover…'}
		</button>
	{/if}
	{#if image.edits}
		{@render photoAction('unedit', 'Undo edit')}
	{/if}
</div>
