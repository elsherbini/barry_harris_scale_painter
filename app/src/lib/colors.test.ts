import { describe, it, expect } from 'vitest';
import { SCALE_COLORS, scaleColor, shortName } from './colors';
import { ALL_SCALES } from './scales';

describe('SCALE_COLORS', () => {
	it('has a color for every one of the 45 scales', () => {
		for (const s of ALL_SCALES) {
			expect(SCALE_COLORS[s.name], s.name).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('C Maj6 Diminished is orange and G Min6 Diminished is magenta', () => {
		expect(scaleColor('C Maj6 Diminished')).toBe('#f09a41');
		expect(scaleColor('G Min6 Diminished')).toBe('#ce1ced');
	});

	it('scales a minor third apart share a color', () => {
		expect(scaleColor('A Maj6 Diminished')).toBe(scaleColor('Eb Maj6 Diminished'));
	});
});

describe('shortName', () => {
	const byName = (n: string) => ALL_SCALES.find(s => s.name === n)!;
	it('formats each scale type', () => {
		expect(shortName(byName('C Maj6 Diminished'))).toBe('C6 dim');
		expect(shortName(byName('G Min6 Diminished'))).toBe('Gm6 dim');
		expect(shortName(byName('Bb Dom7 Diminished'))).toBe('Bb7 dim');
		expect(shortName(byName('C Dom7b5 Diminished'))).toBe('C7b5 dim');
		expect(shortName(byName('Db Octatonic'))).toBe('Db oct');
	});
});
