<script>
	import '../app.css';
	import '@fontsource-variable/inter';
	import '@fontsource/bebas-neue';
	import Header from './Header.svelte';

	let { children } = $props();
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
