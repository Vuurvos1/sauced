import { createAndSetSessionTokenCookie } from '$lib/server/session';
import {
	google,
	GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME,
	GOOGLE_OAUTH_STATE_COOKIE_NAME
} from '$lib/server/oauth';
import { decodeIdToken } from 'arctic';

import type { RequestEvent } from '@sveltejs/kit';
import type { OAuth2Tokens } from 'arctic';

import { db } from '$lib/db';
import { oauthAccountTable, userTable } from '@app/db/schema';
import { eq, and } from 'drizzle-orm';

type GoogleUser = {
	sub: string;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
	email: string;
	email_verified: boolean;
	locale: string;
};

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME) ?? null;
	const codeVerifier = event.cookies.get(GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME) ?? null;

	if (code === null || state === null || storedState === null || codeVerifier === null) {
		return new Response(null, {
			status: 400
		});
	}
	if (state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	let tokens: OAuth2Tokens;
	try {
		tokens = await google.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		console.error(e);
		// Invalid code or client credentials
		return new Response(null, {
			status: 400
		});
	}

	const claims = decodeIdToken(tokens.idToken()) as GoogleUser;

	if (!claims.email) {
		return new Response('No primary email address', {
			status: 400
		});
	}

	if (!claims.email_verified) {
		return new Response('Unverified email', {
			status: 400
		});
	}

	// Check if the user already exists
	const [existingUser] = await db.select().from(userTable).where(eq(userTable.email, claims.email));

	if (existingUser) {
		// Check if the user already has a Google OAuth account linked
		const [existingOauthAccount] = await db
			.select()
			.from(oauthAccountTable)
			.where(
				and(
					eq(oauthAccountTable.providerId, 'google'),
					eq(oauthAccountTable.providerUserId, claims.sub)
				)
			);

		if (!existingOauthAccount) {
			// Add the 'google' auth provider to the user's authMethods list
			const authMethods = existingUser.authMethods || [];
			authMethods.push('google');

			await db.transaction(async (trx) => {
				// Link the Google OAuth account to the existing user
				await trx.insert(oauthAccountTable).values({
					userId: existingUser.id,
					providerId: 'google',
					providerUserId: claims.sub
				});

				// Update the user's authMethods list
				await trx
					.update(userTable)
					.set({
						authMethods
					})
					.where(eq(userTable.id, existingUser.id));
			});
		}

		console.log('User already exists, logging in...');
		await createAndSetSessionTokenCookie(existingUser.id, event.cookies);

		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	}

	// TODO: handle username collisions

	// Create a new user and their OAuth account
	const userId = await db.transaction(async (trx) => {
		const [insertedUser] = await trx
			.insert(userTable)
			.values({
				username: claims.name,
				email: claims.email,
				emailVerified: true,
				authMethods: ['google']
			})
			.returning({ id: userTable.id });

		await trx.insert(oauthAccountTable).values({
			userId: insertedUser.id,
			providerId: 'google',
			providerUserId: claims.sub
		});

		return insertedUser.id;
	});

	console.log('New user created, logging in...');
	await createAndSetSessionTokenCookie(userId, event.cookies);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}
