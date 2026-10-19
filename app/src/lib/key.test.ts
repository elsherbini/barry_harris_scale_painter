import { describe, it, expect } from 'vitest';
import { keyFromAbc, keyChroma, MODE_OPTIONS } from './key';

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
