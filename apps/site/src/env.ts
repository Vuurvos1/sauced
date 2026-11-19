import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_BASE_URL: { public: true, static: true },
	// R2 bucket domain. Unset, the site shows the shops' own image URLs.
	PUBLIC_IMAGE_BASE_URL: {
		public: true,
		static: true,
		schema: (value) => value?.replace(/\/$/, '') || undefined
	},
	BETTER_AUTH_SECRET: {},
	GOOGLE_CLIENT_ID: { static: true },
	GOOGLE_CLIENT_SECRET: { static: true },
	DATABASE_URL: { static: true },
	RESEND_API_KEY: { static: true }
});
