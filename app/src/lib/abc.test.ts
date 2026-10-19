import { describe, it, expect } from 'vitest';
import { makeDimAbc, DEFAULT_ABC } from './abc';

describe('makeDimAbc', () => {
	it('adds clef=diminished to the K: field', () => {
		expect(makeDimAbc('X:1\nK:C\nCDEF|')).toBe('X:1\nK:C clef=diminished\nCDEF|');
	});
	it('rewrites voice clefs', () => {
		expect(makeDimAbc('K:C\nV:1 treble\nV:2 clef=bass\n')).toBe(
			'K:C clef=diminished\nV:1 diminished\nV:2 clef=diminished-8\n'
		);
	});
	it('drops octave= modifiers', () => {
		expect(makeDimAbc('K:C clef=treble octave=-1\n')).not.toContain('octave=');
	});
});

describe('DEFAULT_ABC', () => {
	it('is Für Elise with a treble and a bass voice', () => {
		expect(DEFAULT_ABC).toMatch(/^X:1$/m);
		expect(DEFAULT_ABC).toMatch(/^T:Für Elise$/m);
		expect(DEFAULT_ABC).toMatch(/^K:Am$/m);
		expect(DEFAULT_ABC).toMatch(/^V:2 bass$/m);
		expect(DEFAULT_ABC.split('\n').filter(l => l.includes('|')).length).toBeGreaterThanOrEqual(2);
	});

	it('moves both Für Elise voices onto diminished clefs', () => {
		const dim = makeDimAbc(DEFAULT_ABC);
		expect(dim).toMatch(/^K:Am clef=diminished$/m);
		expect(dim).toMatch(/^V:2 diminished-8$/m);
	});
});
