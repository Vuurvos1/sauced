import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

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
	RESEND_API_KEY: { static: true },
	// Where the admin photo editor writes edited copies; the same bucket as
	// PUBLIC_IMAGE_BASE_URL serves. Unset, editing is unavailable.
	R2_ENDPOINT: { schema: optional },
	R2_BUCKET: { schema: optional },
	R2_ACCESS_KEY_ID: { schema: optional },
	R2_SECRET_ACCESS_KEY: { schema: optional }
});
