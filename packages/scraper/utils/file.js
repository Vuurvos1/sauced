import fs from 'node:fs';

/**
 * @param {string} path
 */
export function createDir(path) {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path, { recursive: true });
	}
}

/**
 * @param {string} path
 * @param {string | Buffer} data
 */
export function writeFile(path, data) {
	const dirPath = path.substring(0, path.lastIndexOf('/'));
	createDir(dirPath);
	fs.writeFileSync(path, data);
}

/**
 * @param {string} store
 * @param {string} url
 */
export function getCachePath(store, url) {
	const parsedUrl = new URL(url);
	const path = parsedUrl.pathname + parsedUrl.search;
	const cachePath = path.replace(/\//g, '_');

	return `./cache/${store}/${cachePath}.html`;
}
