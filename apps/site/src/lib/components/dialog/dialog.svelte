<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { X } from '@o7/icon/lucide';
	import { fade } from 'svelte/transition';

	interface Props {
		title: string;
		open?: boolean;
		children?: Snippet;
	}

	let { title, open = $bindable(false), children }: Props = $props();

	// bits-ui's `child` snippet params aren't inferred through svelte2tsx
	type ChildProps = { props: Record<string, unknown>; open: boolean };

	const duration = 100;
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open: visible }: ChildProps)}
				{#if visible}
					<div
						{...props}
						transition:fade={{ duration }}
						class="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 backdrop-blur-sm"
					></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>

		<!-- greater than the fade duration, so the page doesn't shift mid-transition -->
		<Dialog.Content forceMount restoreScrollDelay={duration + 50}>
			{#snippet child({ props, open: visible }: ChildProps)}
				{#if visible}
					<div class="fixed inset-0 z-50 w-screen overflow-y-auto" transition:fade={{ duration }}>
						<div
							class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
						>
							<div
								{...props}
								class="relative w-full transform overflow-hidden rounded-lg bg-white text-left shadow-xl sm:my-8 sm:max-w-lg"
							>
								<div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
									<Dialog.Title class="sr-only">{title}</Dialog.Title>

									<Dialog.Close class="absolute right-4 top-4" aria-label="close modal">
										<X size={20} />
									</Dialog.Close>

									{@render children?.()}
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
