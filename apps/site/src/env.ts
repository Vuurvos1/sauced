import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	PUBLIC_BASE_URL: { public: true, static: true },
	BETTER_AUTH_SECRET: {},
	GOOGLE_CLIENT_ID: { static: true },
	GOOGLE_CLIENT_SECRET: { static: true },
	DATABASE_URL: { static: true },
	RESEND_API_KEY: { static: true },
	// Workers AI over its REST API, for review moderation where the site has no AI
	// binding (Vercel, local). Unset, reviews save unmoderated there.
	CLOUDFLARE_ACCOUNT_ID: { schema: optional },
	CLOUDFLARE_AI_TOKEN: { schema: optional },
	// Locally, the Workers AI stand-in from docker-compose.yaml.
	CLOUDFLARE_API_BASE_URL: { schema: optional }
});
