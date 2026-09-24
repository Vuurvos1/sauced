<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/form/TextInput.svelte';
	import Meta from '$lib/components/Meta.svelte';
</script>

<Meta title="Forgot password" noindex />

<section class="mb-12 grid h-full flex-1 place-items-center">
	<div class="container max-w-xl">
		<h2 class="h3">Send reset email</h2>

		<form class="flex flex-col gap-4" method="POST" action="?/sendPasswordResetEmail" use:enhance>
			<TextInput label="Email" name="email" id="email" required></TextInput>

			<button class="btn" type="submit">Submit</button>
		</form>
	</div>
</section>
