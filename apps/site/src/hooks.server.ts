import { auth } from '#lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { sequence, type Handle } from '@sveltejs/kit/hooks';

const handleAuth: Handle = async ({ event, resolve }) => {
	// Prerendering has no visitor, and no database to look one up in.
	if (building) {
		event.locals.session = null;
		event.locals.user = null;
		return resolve(event);
	}

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(handleAuth);
