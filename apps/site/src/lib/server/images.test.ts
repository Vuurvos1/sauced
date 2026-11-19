import { describe, expect, it } from 'vitest';
import { withoutDuplicatePhotos } from './images.js';

const hash = (fill: string, flips = 0) => {
	// `flips` low bits differ from the all-`fill` hash.
	const base = BigInt(`0x${fill.repeat(64)}`);
	return (base ^ ((1n << BigInt(flips)) - 1n)).toString(16).padStart(64, '0');
};

describe('withoutDuplicatePhotos', () => {
	it('keeps the first of two near-identical photos', () => {
		const photos = [
			{ id: 'main', phash: hash('a') },
			{ id: 'copy', phash: hash('a', 12) },
			{ id: 'back', phash: hash('a', 40) }
		];
		expect(withoutDuplicatePhotos(photos).map((p) => p.id)).toEqual(['main', 'back']);
	});

	it('keeps photos it has no fingerprint for', () => {
		const photos = [
			{ id: 'a', phash: null },
			{ id: 'b', phash: null }
		];
		expect(withoutDuplicatePhotos(photos)).toHaveLength(2);
	});
});
