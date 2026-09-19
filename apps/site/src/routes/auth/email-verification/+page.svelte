<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="container">
	<h1 class="mb-6 text-2xl font-bold leading-none">Verify your email</h1>

	<h2 class="mb-5">
		Welcome aboard 🎉! We've sent a verification link to
		{#if data.email}<strong>{data.email}</strong>{:else}your email address{/if}. Click the link in the
		email to complete your registration.
	</h2>

	<form method="post" action="?/resend" use:enhance class="mt-4 flex flex-col gap-2">
		<input type="email" name="email" placeholder="your@email.com" value={data.email} required />

		<button type="submit">Resend verification email</button>

		{#if form?.message}
			<p>{form.message}</p>
		{/if}
	</form>
</div>
