import { describe, it, expect } from 'vitest';
import { keyFromAbc, keyChroma, keyNotes, MODE_OPTIONS, rootOptions, respellKey } from './key';

describe('keyFromAbc', () => {
	it('maps abcjs key signatures to tonal root + mode', () => {
		expect(keyFromAbc({ root: 'C', acc: '', mode: '' })).toEqual({ root: 'C', mode: 'major' });
		expect(keyFromAbc({ root: 'A', acc: '', mode: 'm' })).toEqual({ root: 'A', mode: 'minor' });
		expect(keyFromAbc({ root: 'B', acc: 'b', mode: 'Mix' })).toEqual({ root: 'Bb', mode: 'mixolydian' });
		expect(keyFromAbc({ root: 'F', acc: '#', mode: 'Dor' })).toEqual({ root: 'F#', mode: 'dorian' });
	});

	it('returns null for no key', () => {
		expect(keyFromAbc({})).toBeNull();
		expect(keyFromAbc({ root: 'none', acc: '', mode: '' })).toBeNull();
	});
});

describe('keyChroma', () => {
	it('C major chroma', () => {
		expect(keyChroma({ root: 'C', mode: 'major' })).toBe('101011010101');
	});
	it('unknown mode gives null', () => {
		expect(keyChroma({ root: 'C', mode: 'nonsense' })).toBeNull();
	});
});

describe('MODE_OPTIONS', () => {
	it('starts with major and minor and includes melodic minor modes', () => {
		expect(MODE_OPTIONS[0]).toBe('major');
		expect(MODE_OPTIONS[1]).toBe('minor');
		expect(MODE_OPTIONS).toContain('altered');
		expect(MODE_OPTIONS).toContain('harmonic minor');
	});
});

describe('rootOptions', () => {
	it('offers the twelve roots spelled with flats or sharps', () => {
		expect(rootOptions('flat')).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
		expect(rootOptions('sharp')).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
	});
});

describe('respellKey', () => {
	it('moves a chosen key to the enharmonic root so its notes read in the chosen accidentals', () => {
		const sharp = respellKey({ root: 'Db', mode: 'minor' }, 'sharp');
		expect(sharp).toEqual({ root: 'C#', mode: 'minor' });
		expect(keyNotes(sharp)).toEqual(['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B']);
		expect(respellKey({ root: 'F#', mode: 'major' }, 'flat')).toEqual({ root: 'Gb', mode: 'major' });
	});
	it('leaves natural roots and non-key overrides alone', () => {
		expect(respellKey({ root: 'A', mode: 'minor' }, 'sharp')).toEqual({ root: 'A', mode: 'minor' });
		expect(respellKey(null, 'sharp')).toBeNull();
		expect(respellKey('none', 'sharp')).toBe('none');
	});
});
