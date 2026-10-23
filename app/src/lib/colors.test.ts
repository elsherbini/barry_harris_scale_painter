import { describe, it, expect } from 'vitest';
import { SCALE_COLORS, DIM_COLORS, ELEMENTS_DIM_COLORS, scaleColor, shortName } from './colors';
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

describe('scaleColor by root diminished', () => {
	it('colors each scale by the dim7 chord containing its root', () => {
		expect(scaleColor('C Maj6 Diminished', 'dim')).toBe(DIM_COLORS.c);
		expect(scaleColor('A Min6 Diminished', 'dim')).toBe(DIM_COLORS.c);
		expect(scaleColor('Db Dom7 Diminished', 'dim')).toBe(DIM_COLORS.db);
		expect(scaleColor('E Dom7b5 Diminished', 'dim')).toBe(DIM_COLORS.db);
		expect(scaleColor('D Maj6 Diminished', 'dim')).toBe(DIM_COLORS.d);
		expect(scaleColor('B Min6 Diminished', 'dim')).toBe(DIM_COLORS.d);
	});

	it('uses only three colors across all 45 scales, and octatonics keep their family color', () => {
		expect(new Set(ALL_SCALES.map(s => scaleColor(s.name, 'dim'))).size).toBe(3);
		for (const n of ['C Octatonic', 'Db Octatonic', 'D Octatonic']) {
			expect(scaleColor(n, 'dim'), n).not.toBe('#999999');
		}
		expect(scaleColor('C Octatonic', 'dim')).toBe(DIM_COLORS.c);
	});

	it('elements mode uses the abcjs elements palette: C dim green, Db dim blue, D dim red', () => {
		expect(ELEMENTS_DIM_COLORS).toEqual({ c: '#3bb34b', db: '#4da2d2', d: '#d82554' });
		expect(scaleColor('A Min6 Diminished', 'dim-elements')).toBe(ELEMENTS_DIM_COLORS.c);
		expect(scaleColor('E Dom7b5 Diminished', 'dim-elements')).toBe(ELEMENTS_DIM_COLORS.db);
		expect(scaleColor('B Min6 Diminished', 'dim-elements')).toBe(ELEMENTS_DIM_COLORS.d);
		expect(new Set(ALL_SCALES.map(s => scaleColor(s.name, 'dim-elements'))).size).toBe(3);
	});

	it('defaults to the family palette', () => {
		expect(scaleColor('C Maj6 Diminished')).toBe(scaleColor('C Maj6 Diminished', 'family'));
	});
});

describe('scaleColor in metaharmony mode', () => {
	it('mixes each diminished primary into a secondary taken from the family palette', () => {
		// yellow (C dim) roots -> orange, the C6 family color
		expect(scaleColor('A Min6 Diminished', 'metaharmony')).toBe(SCALE_COLORS['C Maj6 Diminished']);
		// red (Db dim) roots -> purple, the G6 family color
		expect(scaleColor('E Dom7b5 Diminished', 'metaharmony')).toBe(SCALE_COLORS['G Maj6 Diminished']);
		// blue (D dim) roots -> green, the F6 family color
		expect(scaleColor('B Min6 Diminished', 'metaharmony')).toBe(SCALE_COLORS['F Maj6 Diminished']);
	});

	it('uses only three colors across all 45 scales', () => {
		expect(new Set(ALL_SCALES.map(s => scaleColor(s.name, 'metaharmony'))).size).toBe(3);
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
	it('respells the root as a sharp on request, leaving the suffix alone', () => {
		expect(shortName(byName('Bb Dom7 Diminished'), 'sharp')).toBe('A#7 dim');
		expect(shortName(byName('C Dom7b5 Diminished'), 'sharp')).toBe('C7b5 dim');
	});
});
