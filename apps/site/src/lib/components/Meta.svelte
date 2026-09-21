<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_BASE_URL } from '$env/static/public';
	import { SITE_DESCRIPTION, SITE_NAME, formatTitle, metaDescription } from '$lib/utils/seo';

	let {
		title,
		description,
		image,
		imageAlt,
		canonical,
		noindex = false,
		brandFirst = false
	}: {
		title?: string;
		description?: string | null;
		/** Absolute, or root-relative to this site. */
		image?: string | null;
		imageAlt?: string;
		/** Defaults to the current path; pass one to fold query strings into a single URL. */
		canonical?: string;
		noindex?: boolean;
		/** Lead with the site name instead of trailing it — for the home page. */
		brandFirst?: boolean;
	} = $props();

	const fullTitle = $derived(formatTitle(title, brandFirst));
	const summary = $derived(metaDescription(description) ?? SITE_DESCRIPTION);

	// Resolved against the configured base URL, so a preview deployment can't
	// nominate its own host as canonical.
	const canonicalUrl = $derived(new URL(canonical ?? page.url.pathname, PUBLIC_BASE_URL).href);
	const imageUrl = $derived(image ? new URL(image, PUBLIC_BASE_URL).href : null);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={summary} />
	<link rel="canonical" href={canonicalUrl} />
	{#if noindex}
		<meta name="robots" content="noindex, follow" />
	{/if}

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={summary} />
	<meta property="og:url" content={canonicalUrl} />
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta property="og:image:alt" content={imageAlt ?? title ?? SITE_NAME} />
	{/if}

	<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={summary} />
	{#if imageUrl}
		<meta name="twitter:image" content={imageUrl} />
		<meta name="twitter:image:alt" content={imageAlt ?? title ?? SITE_NAME} />
	{/if}
</svelte:head>
