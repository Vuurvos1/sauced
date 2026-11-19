import { AwsClient } from 'aws4fetch';
import { IMAGE_CACHE_CONTROL } from './images.js';

/**
 * @typedef {{
 *   has(name: string): Promise<boolean>,
 *   get(name: string): Promise<ArrayBuffer>,
 *   put(name: string, body: ArrayBuffer | Uint8Array): Promise<void>
 * }} ImageBucket
 */

/**
 * The image bucket over the S3 API: R2, or any S3-compatible server such as the
 * SeaweedFS one in docker-compose.yaml.
 *
 * @param {{ endpoint: string, bucket: string, accessKeyId: string, secretAccessKey: string }} config
 * @returns {ImageBucket}
 */
export function createImageBucket({ endpoint, bucket, accessKeyId, secretAccessKey }) {
	const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
	const base = `${endpoint.replace(/\/$/, '')}/${bucket}`;

	return {
		async has(name) {
			return (await client.fetch(`${base}/${name}`, { method: 'HEAD' })).ok;
		},
		async get(name) {
			const response = await client.fetch(`${base}/${name}`);
			if (!response.ok) throw new Error(`${name} responded ${response.status}`);
			return response.arrayBuffer();
		},
		async put(name, body) {
			const response = await client.fetch(`${base}/${name}`, {
				method: 'PUT',
				// A Node Buffer is a valid body; TypeScript's DOM types just don't list it.
				body: /** @type {BodyInit} */ (body),
				headers: { 'Content-Type': 'image/webp', 'Cache-Control': IMAGE_CACHE_CONTROL }
			});
			if (!response.ok) throw new Error(`upload of ${name} responded ${response.status}`);
		}
	};
}

/**
 * The bucket from R2_* settings. `R2_ENDPOINT` points at any S3-compatible server;
 * without it the account's R2 endpoint is used.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {ImageBucket | null} null when not configured, e.g. a local scrape
 */
export function imageBucketFromEnv(env) {
	const { R2_ACCOUNT_ID, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
	const endpoint =
		R2_ENDPOINT || (R2_ACCOUNT_ID && `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
	if (!endpoint || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
	return createImageBucket({
		endpoint,
		bucket: R2_BUCKET,
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY
	});
}
