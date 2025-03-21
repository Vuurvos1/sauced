<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="container">
	<h1 class="mb-6 text-2xl font-bold leading-none">Email Verification Code</h1>

	<h2 class="mb-5">
		Welcome aboard 🎉! To complete your registration, please enter the verification code we've sent
		to your email:
		<strong>{data.pendingUserEmail}</strong>.
	</h2>

	<form use:enhance method="post" class="space-y-4" action="?/verifyCode">
		<label for="verificationCode">Verification Code</label>

		<!-- TODO: auto fill from url -->
		<input
			type="text"
			id="verificationCode"
			name="verificationCode"
			required
			placeholder="Enter your verification code here"
		/>

		{#if form?.message}
			<p>{form.message}</p>
		{/if}

		<button type="submit">Verify</button>
	</form>

	<form
		method="post"
		action="?/sendNewCode"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'failure') {
					// toast.error(result.data?.message);
				}

				if (result.type === 'success') {
					// toast.success(result.data?.message);
				}
			};
		}}
		class="mt-4"
	>
		<button type="submit">Send new code</button>
	</form>
</div>
