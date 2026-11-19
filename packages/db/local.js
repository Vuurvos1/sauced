/**
 * Stops a script that writes test or seed data, or empties tables, from running
 * against a hosted database by mistake.
 *
 * @param {string | undefined} databaseUrl
 * @param {string} why shown when refusing
 */
export function assertLocalDatabase(databaseUrl, why) {
	if (!databaseUrl) {
		console.error('DATABASE_URL is not set.');
		process.exit(1);
	}
	const host = new URL(databaseUrl).hostname;
	if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
		console.error(`Refusing to write to ${host}: ${why}`);
		process.exit(1);
	}
}
