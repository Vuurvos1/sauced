<script lang="ts">
	import type { RemoteFormField } from '$app/server';

	interface Props {
		field: RemoteFormField<string>;
	}

	let { field }: Props = $props();

	const rating = $derived(Number(field.value()) || 0);

	let hoverRating = $state(0);
</script>

<fieldset class="star-rating">
	<legend class="mb-2">Your rating:</legend>
	<div
		role="group"
		onmouseleave={() => (hoverRating = 0)}
		class="flex flex-row gap-2 text-gray-300"
	>
		{#each { length: 5 } as _, i}
			<label
				onmouseenter={() => (hoverRating = i + 1)}
				class:text-yellow-500={i < hoverRating || (i < rating && hoverRating === 0)}
				class="cursor-pointer"
			>
				<input {...field.as('radio', String(i + 1))} class="sr-only" />

				<span class="sr-only">{i + 1}</span>

				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition duration-100 hover:scale-110"
				>
					<clipPath id="star-clip">
						<polygon
							points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
						/>
					</clipPath>

					<rect
						x="0"
						y="0"
						width="100%"
						height="100%"
						fill="currentColor"
						clip-path="url(#star-clip)"
					></rect>

					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
			</label>
		{/each}
	</div>
</fieldset>

<style lang="postcss">
	/* input:checked + label {
		color: blue;
	} */
</style>
