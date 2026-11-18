<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Meta from '#lib/components/Meta.svelte';
	import SauceEditor from '#lib/components/admin/SauceEditor.svelte';

	let { data } = $props();
	const { sauce, images, next, canEdit } = $derived(data);

	let reviewForm = $state<HTMLFormElement>();

	function shortcut(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		// Not while typing, nor behind the photo editor.
		if (target.closest('input, textarea, select, [contenteditable]')) return;
		if (document.querySelector('[role="dialog"]')) return;
		if (event.key === 'r' && !sauce.reviewedAt && !sauce.hiddenAt) reviewForm?.requestSubmit();
		if (event.key === 'n' && next) goto(resolve('/admin/sauces/[slug]', { slug: next }));
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

	<div class="mb-4 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="h1">{sauce.name}</h1>
			<p class="text-gray-600">
				{sauce.makerName ?? 'No maker'} ·
				<a class="underline" href={resolve('/sauces/[slug]', { slug: sauce.slug })}>public page</a>
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			{#if !sauce.reviewedAt && !sauce.hiddenAt}
				<form method="post" action="?/review" use:enhance bind:this={reviewForm}>
					<button class="btn">Mark reviewed &amp; next <kbd class="opacity-60">R</kbd></button>
				</form>
			{/if}
			{#if next}
				<a class="btn btn-outline" href={resolve('/admin/sauces/[slug]', { slug: next })}>
					Skip <kbd class="opacity-60">N</kbd>
				</a>
			{/if}
		</div>
	</div>

	<SauceEditor {sauce} {images} {canEdit} />
</div>
