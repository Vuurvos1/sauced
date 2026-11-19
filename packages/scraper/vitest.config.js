import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	// `pnpm scrapers diff` unpacks an older copy of this package there.
	test: { exclude: [...configDefaults.exclude, '.diff-base/**'] }
});
