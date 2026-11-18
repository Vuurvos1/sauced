<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Dialog } from '#lib/components/dialog/index.js';

	type Mask = { x: number; y: number; width: number; height: number };

	interface Props {
		open: boolean;
		imageId: string;
		masks: Mask[];
	}

	let { open = $bindable(), imageId, masks: initial }: Props = $props();

	/** Must match IMAGE_WIDTHS in packages/scraper/images.js. */
	const WIDTHS = [400, 800];

	let masks = $state<Mask[]>([]);
	let draft = $state<Mask | null>(null);
	let start: { x: number; y: number } | null = null;
	let frame = $state<HTMLImageElement>();
	let saving = $state(false);
	let problem = $state('');

	// Each opening starts from what is saved.
	$effect(() => {
		if (open) {
			masks = initial.map((mask) => ({ ...mask }));
			problem = '';
		}
	});

	/** The pointer as a fraction of the photo, clamped to its edges. */
	function point(event: PointerEvent) {
		const box = frame!.getBoundingClientRect();
		const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
		return {
			x: clamp((event.clientX - box.left) / box.width),
			y: clamp((event.clientY - box.top) / box.height)
		};
	}

	function down(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		start = point(event);
		draft = { ...start, width: 0, height: 0 };
	}

	function move(event: PointerEvent) {
		if (!start) return;
		const at = point(event);
		draft = {
			x: Math.min(start.x, at.x),
			y: Math.min(start.y, at.y),
			width: Math.abs(at.x - start.x),
			height: Math.abs(at.y - start.y)
		};
	}

	function up() {
		// A click, not a drag, would leave a sliver nobody meant to draw.
		if (draft && draft.width > 0.01 && draft.height > 0.01) masks.push(draft);
		draft = null;
		start = null;
	}

	/** Paints the boxes onto the photo at one width, as WebP. */
	async function render(image: HTMLImageElement, width: number) {
		const scale = Math.min(1, width / Math.max(image.naturalWidth, image.naturalHeight));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(image.naturalWidth * scale);
		canvas.height = Math.round(image.naturalHeight * scale);
		const context = canvas.getContext('2d')!;
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		context.fillStyle = '#ffffff';
		for (const mask of masks) {
			context.fillRect(
				mask.x * canvas.width,
				mask.y * canvas.height,
				mask.width * canvas.width,
				mask.height * canvas.height
			);
		}
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', 0.8)
		);
		// Safari quietly hands back a PNG when it can't encode WebP.
		if (!blob || blob.type !== 'image/webp') {
			throw new Error('This browser can’t save WebP; use Chrome or Firefox to edit photos.');
		}
		return blob;
	}

	async function save() {
		saving = true;
		problem = '';
		try {
			// Always from the unedited photo, so boxes can be moved or removed later.
			const image = new Image();
			image.src = `/admin/images/${imageId}`;
			await image.decode();

			const body = new FormData();
			body.set('imageId', imageId);
			body.set('masks', JSON.stringify(masks));
			for (const width of WIDTHS)
				body.set(`w${width}`, await render(image, width), `${width}.webp`);

			const response = await fetch('?/edit', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (result.type === 'failure') {
				problem = String(result.data?.error ?? 'Saving failed');
				return;
			}
			if (result.type === 'error') {
				problem = result.error?.message ?? 'Saving failed';
				return;
			}
			await invalidateAll();
			open = false;
		} catch (error) {
			problem = (error as Error).message;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog title="Cover parts of the photo" bind:open>
	<p class="mb-3 text-sm text-gray-600">
		Drag to draw a white box. The original photo is kept, so boxes can be changed later.
	</p>

	<div class="relative mx-auto w-fit touch-none select-none">
		<img
			bind:this={frame}
			class="block max-h-[60vh] max-w-full"
			src={`/admin/images/${imageId}`}
			alt="The sauce, with the boxes drawn so far"
			draggable="false"
		/>
		<div
			class="absolute inset-0 cursor-crosshair"
			role="presentation"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={up}
		>
			{#each masks as mask, index (index)}
				<div
					class="absolute bg-white outline outline-2 outline-red-500"
					style:left={`${mask.x * 100}%`}
					style:top={`${mask.y * 100}%`}
					style:width={`${mask.width * 100}%`}
					style:height={`${mask.height * 100}%`}
				>
					<button
						type="button"
						class="absolute -right-3 -top-3 size-6 rounded-full bg-red-500 text-sm font-bold leading-none text-white"
						aria-label={`Remove box ${index + 1}`}
						onpointerdown={(event) => event.stopPropagation()}
						onclick={() => masks.splice(index, 1)}>×</button
					>
				</div>
			{/each}
			{#if draft}
				<div
					class="absolute border-2 border-dashed border-red-500 bg-white/70"
					style:left={`${draft.x * 100}%`}
					style:top={`${draft.y * 100}%`}
					style:width={`${draft.width * 100}%`}
					style:height={`${draft.height * 100}%`}
				></div>
			{/if}
		</div>
	</div>

	{#if problem}<p class="mt-3 text-sm text-red-600" role="alert">{problem}</p>{/if}

	<div class="mt-4 flex justify-end gap-2">
		<button type="button" class="btn btn-outline" onclick={() => (open = false)}>Cancel</button>
		<button type="button" class="btn" disabled={saving || masks.length === 0} onclick={save}>
			{saving ? 'Saving…' : `Save ${masks.length} box${masks.length === 1 ? '' : 'es'}`}
		</button>
	</div>
</Dialog>
