// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-vercel';
// import adapter from '@sveltejs/adapter-cloudflare';
// import adapter from '@sveltejs/adapter-cloudflare-workers';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		// Pin the function runtime instead of letting the adapter infer it from the
		// local Node version. Vercel offers 20.x / 22.x / 24.x (20.x is deprecated
		// from 2026-10-01), so the build machine's Node can move independently.
		adapter: adapter({ runtime: 'nodejs24.x' }),
		experimental: { 
			remoteFunctions: true	
		}
	},

	compilerOptions: {
		experimental: {
			async: true
		}
	},

	vitePlugin: {
		inspector: {
			showToggleButton: 'always'
		}
	}
};

export default config;
