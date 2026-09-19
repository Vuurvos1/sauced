<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import TextInput from '$lib/components/form/TextInput.svelte';

	let { data, form } = $props();
</script>

<section class="mb-12 grid flex-1 place-items-center">
	<div class="container max-w-xl">
		<h2 class="h3">Reset password</h2>

		{#if !data.hasToken}
			<p>
				The reset link is missing a token. Please request a new password reset from the <a
					href="/auth/forgot-password">forgot password</a
				> page.
			</p>
		{:else}
			<form class="flex flex-col gap-4" method="POST" action="?/resetPassword" use:enhance>
				<TextInput label="Password" name="password" id="password" type="password" required />

				<TextInput
					label="Confirm password"
					name="confirmPassword"
					id="confirmPassword"
					type="password"
					required
				/>

				<input type="hidden" name="token" value={page.url.searchParams.get('token')} />

				<button class="btn" type="submit">Submit</button>
			</form>
		{/if}

		{#if form?.message}
			<p class="text-red-500">{form.message}</p>
		{/if}
	</div>
</section>
