<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/form/TextInput.svelte';
	import { Google } from '@o7/icon/remix/solid';

	let { form } = $props();
</script>

{#snippet forgotPassword()}
	<a class="ml-auto font-medium text-blue-700 hover:underline" href="/auth/forgot-password">
		Forgot password
	</a>
{/snippet}

<section class="mb-12 grid h-full flex-1 place-items-center">
	<div class="pb-20">
		<div>
			<h1 class="h1 mb-4 text-center">Sign in</h1>
			<form class="flex flex-col gap-4" method="POST" action="?/login" use:enhance>
				<TextInput label="Email" name="email" required></TextInput>

				<TextInput
					label="Password"
					type="password"
					name="password"
					minlength={6}
					required
					postLabel={forgotPassword}
				></TextInput>

				<button class="btn w-full" type="submit">Continue</button>

				{#if form?.message}
					<p class="text-red-500">{form.message}</p>
				{/if}
			</form>
		</div>

		<div class="my-4 flex items-center">
			<div class="mr-3 flex-grow border-t border-gray-500"></div>
			<div>Or continue with</div>
			<div class="ml-3 flex-grow border-t border-gray-500"></div>
		</div>

		<div class="flex flex-wrap gap-4">
			<a href="/login/google" class="btn btn-outline w-full">
				<Google size="24" stroke="2" />
				<span>Google</span>
			</a>
		</div>

		<p class="mt-8 text-center">
			Don't have an account? <a class="font-medium text-blue-700 hover:underline" href="/signup">
				Create an account
			</a>
		</p>
	</div>
</section>
