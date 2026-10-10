import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_BASE_URL: { public: true, static: true },
	BETTER_AUTH_SECRET: {},
	GOOGLE_CLIENT_ID: { static: true },
	GOOGLE_CLIENT_SECRET: { static: true },
	DATABASE_URL: { static: true },
	RESEND_API_KEY: { static: true }
});
