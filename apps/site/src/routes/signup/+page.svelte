<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/form/TextInput.svelte';
	import { Google } from '@o7/icon/remix/solid';

	let { form } = $props();
</script>

<section class="mb-12 grid h-full flex-1 place-items-center">
	<div class="w-full max-w-sm">
		<h1 class="h1 mb-4 text-center">Create an account</h1>
		<form class="flex flex-col gap-4" method="POST" action="?/signup" use:enhance>
			<TextInput label="Username" name="username" minlength={1} maxlength={30} required></TextInput>

			<TextInput label="Email" type="email" name="email" required></TextInput>

			<TextInput
				label="Password"
				type="password"
				name="password"
				minlength={6}
				maxlength={255}
				required
			></TextInput>

			<button class="btn w-full" type="submit">Continue</button>

			{#if form?.message}
				<p class="text-red-500">{form.message}</p>
			{/if}
		</form>

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
			Already have an account? <a class="font-medium text-blue-700 hover:underline" href="/login">
				Login
			</a>
		</p>
	</div>
</section>
