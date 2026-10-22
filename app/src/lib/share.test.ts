import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, DEFAULT_SHARE_STATE, type ShareState } from './share';
import { DEFAULT_ABC } from './abc';

const full: ShareState = {
	abc: 'X:1\nK:C\nCDEF|GABc|',
	regions: [
		{ line: 0, start: 0, end: 0.75, scaleName: 'C Maj6 Diminished' },
		{ line: 1, start: 0.25, end: 1.5, scaleName: 'G Dom7 Diminished' },
	],
	view: 'side-by-side',
	colors: 'metaharmony',
	labelColors: 'dim',
	acc: 'sharp',
	key: { root: 'A', mode: 'minor' },
};

describe('encodeState / decodeState', () => {
	it('round-trips a full state document', async () => {
		const token = await encodeState(full);
		expect(token).not.toBe('');
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);   // base64url, safe in a fragment
		expect(await decodeState(token)).toEqual(full);
	});

	it('round-trips the "none" key override and a null key', async () => {
		expect((await decodeState(await encodeState({ ...full, key: 'none' })))?.key).toBe('none');
		expect((await decodeState(await encodeState({ ...full, key: null })))?.key).toBeNull();
	});

	it('encodes the default state as an empty token so a fresh visit keeps a clean URL', async () => {
		expect(await encodeState(DEFAULT_SHARE_STATE)).toBe('');
		expect(DEFAULT_SHARE_STATE.abc).toBe(DEFAULT_ABC);
	});

	it('compresses: a long tune encodes shorter than its own length', async () => {
		const token = await encodeState({ ...DEFAULT_SHARE_STATE, regions: full.regions });
		expect(token.length).toBeLessThan(DEFAULT_ABC.length);
	});

	it('returns null for a malformed token', async () => {
		expect(await decodeState('')).toBeNull();
		expect(await decodeState('not base64url!!')).toBeNull();
		expect(await decodeState('AAAA')).toBeNull();
	});

	it('returns null for an unknown document version', async () => {
		const token = await encodeState(full);
		// Build a v99 token by hand via the same codec path the module uses.
		const { encodeDocument } = await import('./share');
		const bad = await encodeDocument({ v: 99, abc: 'X:1' });
		expect(bad).not.toBe('');
		expect(await decodeState(bad)).toBeNull();
		expect(await decodeState(token)).not.toBeNull();
	});

	it('reads links made before the label-color toggle as the family palette', async () => {
		const { encodeDocument } = await import('./share');
		const old = await encodeDocument({ v: 1, abc: 'X:1', regions: [], view: 'traditional', colors: 'bw', acc: 'flat', key: null });
		expect((await decodeState(old))?.labelColors).toBe('family');
	});

	it('returns null when a region tuple is the wrong shape', async () => {
		const { encodeDocument } = await import('./share');
		const bad = await encodeDocument({ v: 1, abc: 'X:1', regions: [[0, 0]], view: 'traditional', colors: 'bw', acc: 'flat', key: null });
		expect(await decodeState(bad)).toBeNull();
	});
});
