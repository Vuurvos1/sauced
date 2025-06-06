<script lang="ts">
	import TextInput from '$lib/components/form/TextInput.svelte';
	import DeleteAccountDialog from './DeleteAcountDialog.svelte';
	import { enhance } from '$app/forms';
	import { redirect } from '@sveltejs/kit';
	import { z } from 'zod/v4';

	let { data } = $props();

	let { user } = $derived(data);

	let formErrors: string[] = $state([]);
	let isSuccess = $state(false);

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

				<form
					method="post"
					action="?/updateUser"
					class="space-y-6"
					use:enhance={() => {
						formErrors = [];
						isSuccess = false;

						return ({ result }) => {
							if (result.type === 'success') {
								isSuccess = true;
								formErrors = [];
							} else if (result.type === 'failure') {
								const message = result.data?.messages;
								// check for string array
								const parsed = z.array(z.string()).safeParse(message);
								if (parsed.success) {
									formErrors = parsed.data;
								} else {
									formErrors = ['An unexpected error occurred'];
								}
							}
						};
					}}
				>
					<TextInput label="Username" name="username" value={user.username} />

					{#if formErrors.length > 0}
						<div class="rounded-md bg-red-50 p-4">
							<div class="flex">
								<div class="flex-shrink-0">
									<!-- You can add an error icon here if you want -->
								</div>
								<div class="ml-3">
									<h3 class="text-sm font-medium text-red-800">
										There {formErrors.length === 1 ? 'was an error' : 'were errors'} with your submission
									</h3>
									<div class="mt-2 text-sm text-red-700">
										<ul class="list-disc space-y-1 pl-5">
											{#each formErrors as error}
												<li>{error}</li>
											{/each}
										</ul>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- TODO: turn this into a toast -->
					{#if isSuccess}
						<div class="rounded-md bg-green-50 p-4">
							<div class="flex">
								<div class="ml-3">
									<p class="text-sm font-medium text-green-800">Username updated successfully</p>
								</div>
							</div>
						</div>
					{/if}

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
