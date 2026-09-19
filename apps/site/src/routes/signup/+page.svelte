<script lang="ts">
	import TextInput from '$lib/components/form/TextInput.svelte';
	import PasswordRequirements from '$lib/components/form/PasswordRequirements.svelte';
	import { Google } from '@o7/icon/remix/solid';
	import { superForm } from 'sveltekit-superforms';
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	const { form, errors, message, enhance, submitting } = superForm(data.form);

	const signInWithGoogle = () =>
		authClient.signIn.social({ provider: 'google', callbackURL: '/' });
</script>

<section class="mb-12 grid h-full flex-1 place-items-center">
	<div class="w-full max-w-sm">
		<h1 class="h1 mb-4 text-center">Create an account</h1>
		<form class="flex flex-col gap-4" method="POST" action="?/signup" use:enhance>
			<TextInput
				label="Username"
				name="username"
				minlength={1}
				maxlength={30}
				required
				bind:value={$form.username}
				errorMessage={$errors.username?.[0]}
			/>

			<TextInput
				label="Email"
				type="email"
				name="email"
				required
				bind:value={$form.email}
				errorMessage={$errors.email?.[0]}
			/>

			<div class="group">
				<TextInput
					label="Password"
					type="password"
					name="password"
					minlength={8}
					maxlength={255}
					required
					bind:value={$form.password}
					errorMessage={$errors.password?.[0]}
				/>

				<div
					class="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out group-focus-within:mt-1 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100"
				>
					<div class="overflow-hidden">
						<PasswordRequirements password={$form.password} />
					</div>
				</div>
			</div>

			<button class="btn w-full" type="submit" disabled={$submitting}>
				{#if $submitting}
					Creating account...
				{:else}
					Continue
				{/if}
			</button>

			{#if $message}
				<p class="text-center text-red-500">{$message}</p>
			{/if}
		</form>

		<div class="my-4 flex items-center">
			<div class="mr-3 flex-grow border-t border-gray-500"></div>
			<div>Or continue with</div>
			<div class="ml-3 flex-grow border-t border-gray-500"></div>
		</div>

		<div class="flex flex-wrap gap-4">
			<button type="button" class="btn btn-outline w-full" onclick={signInWithGoogle}>
				<Google size="24" stroke="2" />
				<span>Google</span>
			</button>
		</div>

		<p class="mt-8 text-center">
			Already have an account? <a class="font-medium text-blue-700 hover:underline" href="/login">
				Login
			</a>
		</p>
	</div>
</section>
