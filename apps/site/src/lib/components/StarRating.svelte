<script lang="ts">
	import { clamp } from '$lib/utils/index';

	interface Props {
		rating: number;
	}

	let { rating }: Props = $props();

	let starRating = $derived(clamp(Math.round(rating * 2) / 2, 1, 5));

	function getStarFillAmount(i: number) {
		if (starRating <= i) {
			return '0%';
		}

		if (starRating >= i + 1) {
			return '100%';
		}

		return '50%';
	}
</script>

<div class="flex flex-row gap-2">
	{#each { length: 5 } as _, i}
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
			class="lucide lucide-star"
		>
			<clipPath id="star-clip">
				<polygon
					points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
				/>
			</clipPath>

			<rect
				x="0"
				y="0"
				width={getStarFillAmount(i)}
				height="100%"
				fill="currentColor"
				clip-path="url(#star-clip)"
			></rect>

			<polygon
				points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
			/>
		</svg>
	{/each}
</div>
