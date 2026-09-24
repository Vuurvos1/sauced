<script lang="ts">
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';

	const headings: Record<number, string> = {
		400: 'Bad request',
		401: 'Sign in to continue',
		403: 'Not allowed',
		404: 'Page not found',
		429: 'Too many requests'
	};

	const heading = $derived(headings[page.status] ?? 'Something went wrong');

	// SvelteKit fills unhandled errors with its own generic message, which says
	// less than the heading already does.
	const detail = $derived.by(() => {
		const message = page.error?.message;
		return message && message !== heading && message !== 'Internal Error' ? message : null;
	});
</script>

<Meta title={heading} description={detail} noindex />

<section class="container grid flex-1 place-items-center py-12 text-center">
	<div class="max-w-prose space-y-4">
		<p class="text-7xl font-bold text-gray-300">{page.status}</p>

		<h1 class="h1">{heading}</h1>

		{#if detail}
			<p class="text-gray-600">{detail}</p>
		{/if}

		<div class="flex flex-row flex-wrap justify-center gap-4 pt-2">
			<a class="btn" href="/sauces">Browse sauces</a>
			<a class="btn btn-outline" href="/">Go home</a>
		</div>
	</div>
</section>
