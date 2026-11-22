import type { PlaywrightTestConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Populate process.env from .env.test using Vite's own loader — the same one
// SvelteKit uses internally. Empty string as prefix means "load all keys".
Object.assign(process.env, loadEnv('test', __dirname, ''));

const config: PlaywrightTestConfig = {
	webServer: {
		// A production build on workerd, the runtime it is deployed to, not the dev
		// server: on a cold dev server the first navigation in each worker races Vite
		// compiling routes and times out. While iterating on tests, start
		// `pnpm vite dev --mode test --port 4173` yourself and it is reused instead.
		command: 'pnpm vite build --mode test && pnpm wrangler dev --port 4173 --env-file .env.test',
		timeout: 180_000,
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,
	globalSetup: resolve(__dirname, 'tests/global-setup.ts'),
	use: {
		baseURL: 'http://localhost:4173'
	}
};

export default config;
