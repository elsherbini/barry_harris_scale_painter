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
	it('has a key and at least two lines of music', () => {
		expect(DEFAULT_ABC).toMatch(/^K:/m);
		expect(DEFAULT_ABC.split('\n').filter(l => l.includes('|')).length).toBeGreaterThanOrEqual(2);
	});
});
