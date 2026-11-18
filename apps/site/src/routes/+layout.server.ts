import { isAdmin } from '#lib/server/admin.js';

/**
 * Only what pages read: no session token (it's the session cookie, kept HttpOnly
 * for a reason), no email, and no role. `isAdmin` is sent to admins alone, so the
 * page data of everyone else says nothing about roles.
 */
export const load = async ({ locals: { session, user } }) => {
	return {
		session: session ? { userId: session.userId } : null,
		user: user ? { id: user.id, username: user.username } : null,
		...((await isAdmin(user)) ? { isAdmin: true as const } : {})
	};
};
