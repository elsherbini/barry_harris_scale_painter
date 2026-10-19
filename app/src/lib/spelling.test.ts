import { describe, it, expect } from 'vitest';
import { pcName, spellRoot, scaleDisplayName, samePitchClass } from './spelling';
import { ALL_SCALES } from './scales';

describe('pcName', () => {
	it('spells black keys as flats or sharps', () => {
		expect([1, 3, 6, 8, 10].map(pc => pcName(pc, 'flat'))).toEqual(['Db', 'Eb', 'Gb', 'Ab', 'Bb']);
		expect([1, 3, 6, 8, 10].map(pc => pcName(pc, 'sharp'))).toEqual(['C#', 'D#', 'F#', 'G#', 'A#']);
	});
	it('leaves white keys alone', () => {
		expect(pcName(0, 'sharp')).toBe('C');
		expect(pcName(11, 'flat')).toBe('B');
	});
});

describe('spellRoot', () => {
	it('respells a flat root as a sharp and back', () => {
		expect(spellRoot('Eb', 'sharp')).toBe('D#');
		expect(spellRoot('D#', 'flat')).toBe('Eb');
		expect(spellRoot('Eb', 'flat')).toBe('Eb');
		expect(spellRoot('C', 'sharp')).toBe('C');
	});
});

describe('scaleDisplayName', () => {
	const eb = ALL_SCALES.find(s => s.name === 'Eb Maj6 Diminished')!;
	it('respells only the root', () => {
		expect(scaleDisplayName(eb, 'sharp')).toBe('D# Maj6 Diminished');
		expect(scaleDisplayName(eb, 'flat')).toBe('Eb Maj6 Diminished');
	});
});

describe('samePitchClass', () => {
	it('treats enharmonic roots as the same key', () => {
		expect(samePitchClass('Db', 'C#')).toBe(true);
		expect(samePitchClass('Db', 'D')).toBe(false);
	});
});
