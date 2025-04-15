<script lang="ts">
	import Dialog from '$lib/components/dialog/dialog.svelte';
	import { TriangleAlert } from '@o7/icon';
	import { enhance } from '$app/forms';

	let open = $state(false);
</script>

<button
	class="btn btn-danger"
	onclick={() => {
		open = true;
	}}
>
	Delete Account
</button>

<Dialog bind:open>
	<form
		method="POST"
		action="?/deleteAccount"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					open = false;
				}
			};
		}}
	>
		<div class="space-y-4 pb-4">
			<div>
				<h3 class="h3 mb-2 flex items-center gap-2 text-red-500">
					<TriangleAlert size={20} />
					Delete Account
				</h3>
				<p class="pb-2 text-gray-500">
					This action cannot be undone. This will permanently delete your account and remove all
					your data from our servers.
				</p>
			</div>

			<div class="rounded-md bg-red-500/10 p-3 text-sm">
				<p class="font-medium">You will lose:</p>
				<ul class="mt-2 list-disc space-y-1 pl-5">
					<li>All your reviews and ratings</li>
					<li>Your hot sauce collection</li>
					<li>Your profile information</li>
					<li>Your followers and connections</li>
					<li>Access to any premium features</li>
				</ul>
			</div>

			<div class="space-y-2">
				<label for="confirm" class="label block">
					Type <span class="font-bold">DELETE</span> to confirm
				</label>
				<input class="input w-full" id="confirm" name="confirm" placeholder="DELETE" />
			</div>
		</div>

		<div class="flex justify-end gap-2">
			<button type="button" class="btn btn-outline" onclick={() => (open = false)}>Cancel</button>

			<button type="submit" class="btn btn-danger">Delete Account</button>
		</div>
	</form>
</Dialog>
