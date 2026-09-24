<script lang="ts">
	import { passwordRules } from '$lib/validation';

	let { password = '' }: { password?: string } = $props();
</script>

<ul class="space-y-0.5 text-sm">
	{#each passwordRules as rule}
		{@const met = rule.test(password)}
		<li
			class={met ? 'text-green-700' : 'text-gray-500'}
			aria-label={`${rule.label}: ${met ? 'met' : 'not met'}`}
		>
			<span aria-hidden="true">{met ? '✓' : '○'}</span>
			{rule.label}
		</li>
	{/each}
</ul>
