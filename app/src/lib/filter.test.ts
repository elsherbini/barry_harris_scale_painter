import { describe, it, expect } from 'vitest';
import { countKeyOverlap } from './filter';
import { ALL_SCALES } from './scales';
import { Pcset, Scale } from 'tonal';

describe('countKeyOverlap', () => {
	it('C major shares all 7 notes with C Maj6 Diminished', () => {
		const key = Pcset.chroma(Scale.get('C major').notes);
		const s = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
		expect(countKeyOverlap(key, s.chroma)).toBe(7);
	});

	it('matches a direct chroma intersection count', () => {
		const key = Pcset.chroma(Scale.get('C major').notes);
		const s = ALL_SCALES.find(s => s.name === 'Gb Maj6 Diminished')!;
		expect(countKeyOverlap(key, s.chroma)).toBe(
			s.chroma.split('').filter((c, i) => c === '1' && key[i] === '1').length
		);
	});
});
