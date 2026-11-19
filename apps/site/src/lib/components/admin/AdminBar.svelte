<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { dialogOpen, isTyping } from '#lib/utils/keyboard.js';

	interface Props {
		sauce: { slug: string; reviewedAt: Date | null; hiddenAt: Date | null };
		/** The next sauce to review, for Skip; loaded in edit mode only. */
		next: string | null;
		editing: boolean;
	}

	let { sauce, next, editing }: Props = $props();
	let reviewForm = $state<HTMLFormElement>();

	function shortcut(event: KeyboardEvent) {
		if (!editing || event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTyping(event) || dialogOpen()) return;
		if (event.key === 'r' && !sauce.reviewedAt && !sauce.hiddenAt) reviewForm?.requestSubmit();
		if (event.key === 'n' && next) goto(resolve('/sauces/[slug]?edit=1', { slug: next }));
	}
</script>

<svelte:window onkeydown={shortcut} />

<div
	class={[
		'mb-4 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm',
		editing ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
	]}
>
	<a
		class={['btn px-3 py-1 text-sm', editing ? '' : 'btn-outline']}
		href={editing
			? resolve('/sauces/[slug]', { slug: sauce.slug })
			: resolve('/sauces/[slug]?edit=1', { slug: sauce.slug })}
		data-sveltekit-noscroll
		data-sveltekit-replacestate
	>
		{editing ? 'Done editing' : 'Edit'}
	</a>

	{#if sauce.hiddenAt}
		<span class="font-medium text-red-700">Hidden from the site; visitors get a 404</span>
	{:else if sauce.reviewedAt}
		<span class="font-medium text-green-700">
			Reviewed {sauce.reviewedAt.toLocaleDateString()} · locked against the scraper
		</span>
	{:else}
		<span class="text-gray-600">Not reviewed yet</span>
	{/if}

	{#if editing}
		<div class="ml-auto flex flex-wrap gap-2">
			{#if sauce.hiddenAt}
				<form method="post" action="?/showSauce&edit=1" use:enhance>
					<button class="btn btn-outline bg-white px-3 py-1 text-sm">Put back on the site</button>
				</form>
			{:else}
				{#if sauce.reviewedAt}
					<form method="post" action="?/unreview&edit=1" use:enhance>
						<button class="btn btn-outline bg-white px-3 py-1 text-sm">Unlock</button>
					</form>
				{:else}
					<!-- Moves on to the next sauce to review. -->
					<form method="post" action="?/review&edit=1" use:enhance bind:this={reviewForm}>
						<button class="btn px-3 py-1 text-sm">
							Mark reviewed &amp; next <kbd class="opacity-60">R</kbd>
						</button>
					</form>
				{/if}
				<form method="post" action="?/hideSauce&edit=1" use:enhance>
					<button class="btn btn-danger px-3 py-1 text-sm">Hide sauce</button>
				</form>
			{/if}
			{#if next}
				<a
					class="btn btn-outline bg-white px-3 py-1 text-sm"
					href={resolve('/sauces/[slug]?edit=1', { slug: next })}
				>
					Skip <kbd class="opacity-60">N</kbd>
				</a>
			{/if}
			<a class="btn btn-outline bg-white px-3 py-1 text-sm" href={resolve('/admin/review')}>
				Review list
			</a>
		</div>
	{/if}
</div>
