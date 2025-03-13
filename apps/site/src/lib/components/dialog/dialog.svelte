<script lang="ts">
	import { portal, clickOutside, focusTrap, escapeKeydown } from '$lib/actions';
	import type { Snippet } from 'svelte';
	import { X } from '@o7/icon/lucide';
	import { fade } from 'svelte/transition';

	interface Props {
		title?: string;
		open?: boolean;
		children?: Snippet;
	}

	let { title, open = $bindable(false), children }: Props = $props();
</script>

<!-- TODO: body scroll lock -->

<!-- <button
	onclick={() => {
		open = !open;
	}}
	class="btn"
>
	Toggle modal
</button> -->

<div use:portal={'body'}>
	{#if open}
		<div
			class="relative z-10"
			aria-labelledby={title}
			role="dialog"
			aria-modal="true"
			transition:fade={{ duration: 100 }}
		>
			<div
				class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"
			></div>

			<div class="fixed inset-0 z-10 w-screen overflow-y-auto">
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
				>
					<div
						use:clickOutside={() => {
							open = false;
						}}
						use:focusTrap={{}}
						use:escapeKeydown={() => {
							open = !open;
						}}
						class="relative w-full transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:max-w-lg"
					>
						<div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
							<button
								onclick={() => (open = false)}
								class="absolute right-4 top-4"
								aria-label="close modal"
							>
								<X size={20} />
							</button>

							{@render children?.()}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
