<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import '@fontsource/bebas-neue';

	import { onNavigate } from '$app/navigation';
	import Header from './Header.svelte';
	import { Toaster } from 'svelte-sonner';
	import { sharedSauce, takeSkip } from '$lib/view-transition.svelte';

	let { children } = $props();

	const isSaucePage = (url: URL | undefined, slug: string) => url?.pathname === `/sauces/${slug}`;

	onNavigate((navigation) => {
		// Cleared unconditionally so a click that never navigated can't swallow the
		// next transition.
		const skip = takeSkip();

		if (skip) return;
		if (typeof document.startViewTransition !== 'function') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// A leftover name would animate a card with no counterpart on the other
		// side, e.g. paginating /sauces after visiting a detail page.
		const { slug } = sharedSauce;
		if (
			slug &&
			!isSaucePage(navigation.from?.url, slug) &&
			!isSaucePage(navigation.to?.url, slug)
		) {
			sharedSauce.release();
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>Sauced</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header></Header>

	<main class="flex flex-1 flex-col py-8">
		{@render children()}
	</main>
</div>

<Toaster richColors position="top-right" />
