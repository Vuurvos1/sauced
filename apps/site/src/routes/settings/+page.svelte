<script lang="ts">
	import TextInput from '$lib/components/form/TextInput.svelte';
	import DeleteAccountDialog from './DeleteAcountDialog.svelte';
	import { enhance } from '$app/forms';
	import { redirect } from '@sveltejs/kit';

	let { data } = $props();

	let { user } = $derived(data);

	// svelte-ignore state_referenced_locally
	if (!user) {
		redirect(302, '/');
	}
</script>

<section class="container mb-6">
	<h1 class="h2">Edit Profile</h1>
</section>

<div class="space-y-4">
	<section>
		<div class="container">
			<div class="card p-6">
				<h2 class="mb-6 text-xl font-semibold">Basic Information</h2>

				<form method="post" action="?/updateUser" class="space-y-6" use:enhance>
					<TextInput label="Username" name="username" value={user.username} />

					<!-- if changed, show save button -->
					<div class="flex justify-end">
						<button type="submit" class="btn btn-primary">Save Changes</button>
					</div>
				</form>

				<div class="mt-8 border-t border-gray-200 pt-6">
					<div class="flex flex-col gap-4">
						<a href="/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-800">
							Reset Password
						</a>

						<form method="post" action="/?/logout">
							<button type="submit" class="btn btn-outline">Logout</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section>
		<div class="container">
			<div class="card border-red-500 bg-red-400/10">
				<h2 class="h3 mb-2 text-red-500">Danger Zone</h2>

				<p class="mb-6 text-gray-500">Actions in this section can permanently delete your data.</p>
				<!-- danger zone -->

				<div class="flex flex-col gap-2">
					<h3 class="font-medium">Delete Account</h3>
					<p class="mb-2 text-sm text-gray-500">
						Permanently delete your account and all of your content. This action cannot be undone.
					</p>
					<div>
						<DeleteAccountDialog></DeleteAccountDialog>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
