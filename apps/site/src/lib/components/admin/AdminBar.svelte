<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { adminAction, stayHere } from './stay.js';

	interface Props {
		sauce: { slug: string; reviewedAt: Date | null; hiddenAt: Date | null };
		/** The next sauce to review, for "& next" and Skip. */
		next: string | null;
		editing: boolean;
		onError: (message: string) => void;
	}

	let { sauce, next, editing, onError }: Props = $props();
	const stay = $derived(stayHere(onError));
	let reviewForm = $state<HTMLFormElement>();

	function shortcut(event: KeyboardEvent) {
		if (!editing || event.metaKey || event.ctrlKey || event.altKey) return;
		// Not while typing, nor behind the photo editor.
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable]')) return;
		if (document.querySelector('[role="dialog"]')) return;
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
				<form method="post" action={adminAction(sauce.slug, 'showSauce')} use:enhance={stay}>
					<button class="btn btn-outline bg-white px-3 py-1 text-sm">Put back on the site</button>
				</form>
			{:else}
				{#if sauce.reviewedAt}
					<form method="post" action={adminAction(sauce.slug, 'unreview')} use:enhance={stay}>
						<button class="btn btn-outline bg-white px-3 py-1 text-sm">Unlock</button>
					</form>
				{:else}
					<!-- No `stay`: the action moves on to the next sauce to review. -->
					<form
						method="post"
						action={adminAction(sauce.slug, 'review')}
						use:enhance={stay}
						bind:this={reviewForm}
					>
						<button class="btn px-3 py-1 text-sm">
							Mark reviewed &amp; next <kbd class="opacity-60">R</kbd>
						</button>
					</form>
				{/if}
				<form method="post" action={adminAction(sauce.slug, 'hideSauce')} use:enhance={stay}>
					<input type="hidden" name="stay" value="1" />
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
