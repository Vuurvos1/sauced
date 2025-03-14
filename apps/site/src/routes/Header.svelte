<script lang="ts">
	import { page } from '$app/state';
	import { Search, UserRound, Flame, Store } from '@o7/icon/lucide';
	import {
		autoUpdate,
		flip,
		offset,
		useDismiss,
		useFloating,
		useInteractions,
		useRole
	} from '@skeletonlabs/floating-ui-svelte';
	import { fade } from 'svelte/transition';
	import { debounce } from '$lib/utils/debounce.svelte';
	import type { SearchResponse } from '$lib/types/api';
	import { portal } from '$lib/actions';

	let {
		data: { session }
	} = $derived(page);

	let search = $state(page.url.searchParams.get('q') || '');

	let open = $state(false);

	let isLoading = $state(false);
	let searchResults = $state<SearchResponse>({
		makers: [],
		stores: [],
		sauces: []
	});
	let loadingTimeout: ReturnType<typeof setTimeout>;

	async function getSearchResults(search: string) {
		if (search.length < 2) return;

		// Set a timeout to show loading state only if the query takes longer than 300ms
		loadingTimeout = setTimeout(() => {
			isLoading = true;
		}, 500);

		const response = await fetch(`/api/v1/search?q=${search}`);
		const data = await response.json();
		searchResults = data;

		clearTimeout(loadingTimeout);
		isLoading = false;
	}

	$effect(() => {
		if (search.length > 0) {
			open = true;
		}
	});

	// debounced search
	const update = debounce((v: string) => getSearchResults(v), 250);
	$effect(() => {
		update(search);
	});

	// Use Floating
	const floating = useFloating({
		whileElementsMounted: autoUpdate,
		get open() {
			return open;
		},
		onOpenChange: (v) => {
			open = v;
		},
		placement: 'bottom',
		strategy: 'fixed',
		get middleware() {
			return [offset(10), flip()];
		}
	});

	// Interactions
	const role = useRole(floating.context);
	const dismiss = useDismiss(floating.context);
	const interactions = useInteractions([role, dismiss]);
</script>

{#snippet storeItem(store: SearchResponse['stores'][number])}
	<li class="rounded-md p-2 transition-colors hover:bg-gray-100">
		<a
			onclick={() => (open = false)}
			class="flex items-center gap-2"
			href={`/stores/${store.name}`}
		>
			<img
				class="aspect-square size-12 object-contain"
				src={`/assets/stores/${store.name.toLowerCase().replaceAll(' ', '-')}.png`}
				alt={store.name}
			/>
			<div>
				<div class="font-medium">{store.name}</div>
			</div>
		</a>
	</li>
{/snippet}

{#snippet sauceItem(sauce: SearchResponse['sauces'][number])}
	<li class="rounded-md p-2 transition-colors hover:bg-gray-100">
		<a
			onclick={() => (open = false)}
			class="flex items-center gap-2"
			href={`/sauces/${sauce.slug}`}
		>
			<img class="aspect-square size-12 object-contain" src={sauce.imageUrl} alt={sauce.name} />
			<div>
				<div class="font-medium">{sauce.name}</div>
				<div class="text-sm text-gray-500">
					{sauce.ratingCount}
					{sauce.ratingCount === 1 ? 'review' : 'reviews'}
				</div>
			</div>
		</a>
	</li>
{/snippet}

<header class="sticky top-0">
	<nav class="bg-neutral-950 py-4 text-white">
		<ul class="container flex flex-row items-center gap-4 font-medium md:grid md:grid-cols-4">
			<li>
				<a class="flex flex-row items-center gap-2.5 font-logo text-2xl" href="/">
					<svg class="size-8" fill="none" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
						<path
							fill="#DC2626"
							d="M133.28 199.214c6.127-.437 6.401-5.237 6.983-16.293 0-9.31.733-15.825-5.819-16.293-8.146-.582-11.056 15.711-10.474 19.203.582 3.491 1.164 13.965 9.31 13.383ZM364.875 111.348c-.582-5.237 1.746-18.62-6.983-18.62-6.982 0-8.146 11.055-8.146 16.874 0 5.365 2.327 15.13 8.728 15.13 5.27 0 6.931-8.615 6.401-13.384ZM203.108 76.434c-5.848 0-9.311-12.802-9.311-24.44 0-13.965 8.245-20.948 11.638-20.948 3.492 0 5.819 19.203 5.819 28.513 0 7.198-.581 16.875-8.146 16.875Z"
						/>
						<path
							fill="#DC2626"
							d="M78 340.034c0-49.462 19.203-82.63 42.478-102.996-4.073 8.728-8.263 28.513-5.237 36.077 1.164 2.91 8.499.066 16.875-12.219 5.232-7.673 10.045-22.243 15.191-37.822 3.441-10.416 7.031-21.283 10.994-30.842 8.603-20.749 31.423-65.755 37.824-65.755 1.282 0 1.653 2.264 2.203 5.623.948 5.785 2.428 14.821 10.017 21.145 6.983 5.819 13.384 9.721 18.621 7.564 5.237-2.156 24.504-55.783 27.931-82.63 5.131-40.192-1.364-62.161-4.245-71.91-1.041-3.52-1.61-5.446-.993-6.063 2.328-2.328 25.953 15.71 34.332 22.694 10.474 8.728 29.095 25.603 37.824 57.026 4.539 16.342 5.406 34.101 6.203 50.412.734 15.05 1.409 28.867 4.853 39.2.971 2.914 1.89 5.798 2.781 8.598 5.247 16.477 9.555 30.008 18.167 29.225 7.431-.676 9.53-23.43 11.057-39.99.865-9.374 1.546-16.763 2.909-17.036 2.333-.466 4.866 4.977 8.827 13.486 2.435 5.234 5.411 11.627 9.212 18.518.986 1.789 1.997 3.617 3.026 5.478l.035.063c12.955 23.426 28.787 52.053 35.344 73.597 10.803 35.496 17.801 92.211-8.147 146.639-16.143 33.861-45.607 71.984-90.194 93.099v-76.806c0-14.548-4.772-22.927-9.892-28.513-6.983-7.618-13.966-18.621-16.293-28.513-1.844-7.835-5.55-63.086-7.506-95.055h.507s6.305-6.401 6.305-18.621c0-13.965-6.305-18.621-6.305-18.621h-54.889s-6.306 6.401-6.306 18.621c0 13.966 6.306 18.621 6.306 18.621h.148c-1.956 31.969-5.662 87.22-7.506 95.055-2.328 9.892-9.31 20.895-16.293 28.513-5.121 5.586-9.892 13.965-9.892 28.513v87.168C122.113 489.847 78 412.141 78 340.034Z"
						/>
					</svg>
					<span class="-mb-1 hidden leading-none md:inline-block">Sauced</span>
				</a>
			</li>

			<li class="w-full md:col-span-2 md:w-auto">
				<form data-sveltekit-keepfocus action="/sauces">
					<label
						bind:this={floating.elements.reference}
						{...interactions.getReferenceProps()}
						class="relative mx-auto flex w-full max-w-lg flex-row items-center text-base text-black"
					>
						<input
							bind:value={search}
							class="w-full rounded-full bg-white py-1.5 pl-4 pr-12 focus:outline-none"
							placeholder="Search sauces"
							autocomplete="off"
							name="q"
							type="text"
							onfocus={() => {
								if (search.length > 2) open = true;
							}}
						/>
						<button type="submit" class="absolute inset-y-0 right-0 flex items-center pr-4">
							<span class="sr-only">Search</span>
							<Search size={20}></Search>
						</button>
					</label>
				</form>

				<div>
					<!-- Floating Element -->
					{#if open}
						<div
							bind:this={floating.elements.floating}
							use:portal={'body'}
							style={floating.floatingStyles}
							{...interactions.getFloatingProps()}
							class="absolute z-50 max-h-[50vh] w-full max-w-lg divide-y overflow-y-auto rounded border bg-white p-4 text-black shadow-lg"
							transition:fade={{ duration: 100 }}
						>
							<!-- Sauces -->
							{#if isLoading}
								<div class="py-2 text-center">Loading...</div>
							{:else if searchResults.sauces.length > 0}
								<div>
									<div class="flex items-center gap-2">
										<Flame class="text-red-600" size={20}></Flame>
										<h3 class="text-lg font-medium">Sauces</h3>
									</div>

									<ul>
										{#each searchResults.sauces as sauce}
											{@render sauceItem(sauce)}
										{/each}
									</ul>
									<div class="mt-2 flex pb-2">
										<a
											href={`/sauces?q=${encodeURIComponent(search)}`}
											class="ml-auto text-gray-600 hover:underline"
											onclick={() => (open = false)}
										>
											View all results
										</a>
									</div>
								</div>
							{:else if search.length >= 2}
								<p class="py-2">No sauces found matching "{search}"</p>
							{:else}
								<p class="py-2">Type at least 2 characters to search</p>
							{/if}

							{#if !isLoading && searchResults.stores.length > 0}
								<div>
									<div class="mt-4 flex items-center gap-2">
										<Store class="text-green-600" size={20}></Store>
										<h3 class="text-lg font-medium">Stores</h3>
									</div>

									<ul>
										{#each searchResults.stores as store}
											{@render storeItem(store)}
										{/each}
									</ul>
									<div class="mt-2 flex pb-2">
										<a
											href={`/stores?q=${encodeURIComponent(search)}`}
											class="ml-auto text-gray-600 hover:underline"
											onclick={() => (open = false)}
										>
											View all results
										</a>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</li>

			<li class="md:ml-auto">
				{#if session}
					<a aria-label="profile" href="/profile">
						<UserRound size={24}></UserRound>
					</a>
				{:else}
					<a href="/login">login</a>
				{/if}
			</li>
		</ul>
	</nav>
</header>
