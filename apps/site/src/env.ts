import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	PUBLIC_BASE_URL: { public: true, static: true },
	// Read at runtime, from Worker secrets when deployed, so they stay out of the bundle.
	BETTER_AUTH_SECRET: {},
	GOOGLE_CLIENT_ID: {},
	GOOGLE_CLIENT_SECRET: {},
	RESEND_API_KEY: {},
	// Local and tests only. The deployed Workers reach Postgres through Hyperdrive.
	DATABASE_URL: { schema: optional },
	// Workers AI over its REST API, for review moderation where the site has no AI
	// binding (local). Unset, reviews save unmoderated there.
	CLOUDFLARE_ACCOUNT_ID: { schema: optional },
	CLOUDFLARE_AI_TOKEN: { schema: optional },
	// Locally, the Workers AI stand-in from docker-compose.yaml.
	CLOUDFLARE_API_BASE_URL: { schema: optional }
});
