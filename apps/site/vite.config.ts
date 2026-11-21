// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-vercel';

// import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			// Consult https://kit.svelte.dev/docs/integrations#preprocessors
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			inspector: { showToggleButton: 'always' },
			// Pinned so the deployed runtime doesn't follow whatever Node the build
			// machine runs. Keep it in step with `engines` and the workflows.
			adapter: adapter({ runtime: 'nodejs26.x' }),
			experimental: { remoteFunctions: true }
		})
	],
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
});
