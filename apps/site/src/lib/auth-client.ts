import { createAuthClient } from 'better-auth/svelte';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { lastLoginMethodClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	baseURL: PUBLIC_BASE_URL,
	plugins: [lastLoginMethodClient()]
});
