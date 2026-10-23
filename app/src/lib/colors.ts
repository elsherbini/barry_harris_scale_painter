import { Note } from 'tonal';
import { ALL_SCALES, type BarryHarrisScale } from './scales';
import { spellRoot, type Accidentals } from './spelling';

// Colors from reference_apps/filter_scales/scripts/tag-svg.js (the Excalidraw scale diagram).
const FAMILIES: Record<string, string[]> = {
	'#f09a41': ['A Maj6 Diminished', 'C Maj6 Diminished', 'Eb Maj6 Diminished', 'Gb Maj6 Diminished', 'Eb Dom7b5 Diminished', 'C Dom7b5 Diminished'],
	'#7741f0': ['E Maj6 Diminished', 'G Maj6 Diminished', 'Bb Maj6 Diminished', 'Db Maj6 Diminished', 'E Dom7b5 Diminished', 'Db Dom7b5 Diminished'],
	'#29f043': ['F Maj6 Diminished', 'Ab Maj6 Diminished', 'B Maj6 Diminished', 'D Maj6 Diminished', 'F Dom7b5 Diminished', 'D Dom7b5 Diminished'],
	'#f0be35': ['A Min6 Diminished', 'C Min6 Diminished', 'Eb Min6 Diminished', 'Gb Min6 Diminished'],
	'#f05d35': ['A Dom7 Diminished', 'C Dom7 Diminished', 'Eb Dom7 Diminished', 'Gb Dom7 Diminished'],
	'#ce1ced': ['E Min6 Diminished', 'G Min6 Diminished', 'Bb Min6 Diminished', 'Db Min6 Diminished'],
	'#a4f04d': ['F Dom7 Diminished', 'Ab Dom7 Diminished', 'B Dom7 Diminished', 'D Dom7 Diminished'],
	'#6584f0': ['E Dom7 Diminished', 'G Dom7 Diminished', 'Bb Dom7 Diminished', 'Db Dom7 Diminished'],
	'#4df0bf': ['F Min6 Diminished', 'Ab Min6 Diminished', 'B Min6 Diminished', 'D Min6 Diminished'],
	'#f0295d': ['Db Octatonic'],
	'#efe341': ['C Octatonic'],
	'#56b4e9': ['D Octatonic'],
};

export const SCALE_COLORS: Record<string, string> = Object.fromEntries(
	Object.entries(FAMILIES).flatMap(([color, names]) => names.map(n => [n, color]))
);

/**
 * How region labels are colored: the 12 Barry Harris families, or 3 colors keyed to the
 * diminished chord holding the scale's root (C, Db or D dim). 'dim' and 'dim-elements' use the
 * primaries of the abcjs metaharmony and elements palettes; 'metaharmony' uses their secondaries.
 */
export type LabelColorMode = 'family' | 'metaharmony' | 'dim' | 'dim-elements';
export const LABEL_COLOR_MODES: LabelColorMode[] = ['family', 'metaharmony', 'dim', 'dim-elements'];

type DimPalette = { c: string; db: string; d: string };

// The abcjs fork's diminished palettes, so labels match the diminished staff's noteheads.
export const DIM_COLORS: DimPalette = { c: '#d7cc3b', db: '#d82554', d: '#4da2d2' };
export const ELEMENTS_DIM_COLORS: DimPalette = { c: '#3bb34b', db: '#4da2d2', d: '#d82554' };
// Secondaries of the metaharmony primaries, borrowed from the family palette:
// yellow -> orange (C6), red -> purple (G6), blue -> green (F6).
const SECONDARY_COLORS: DimPalette = {
	c: SCALE_COLORS['C Maj6 Diminished'],
	db: SCALE_COLORS['G Maj6 Diminished'],
	d: SCALE_COLORS['F Maj6 Diminished'],
};

/** Color each scale by the dim7 chord its root belongs to. */
function byRootDim(p: DimPalette): Record<string, string> {
	const byChroma = [p.c, p.db, p.d];
	return Object.fromEntries(ALL_SCALES.map(s => [s.name, byChroma[Note.chroma(s.root)! % 3]]));
}

const PALETTES: Record<LabelColorMode, Record<string, string>> = {
	family: SCALE_COLORS,
	metaharmony: byRootDim(SECONDARY_COLORS),
	dim: byRootDim(DIM_COLORS),
	'dim-elements': byRootDim(ELEMENTS_DIM_COLORS),
};

export function scaleColor(name: string, mode: LabelColorMode = 'family'): string {
	return PALETTES[mode][name] ?? '#999999';
}

const SUFFIX: Record<BarryHarrisScale['type'], string> = {
	maj6: '6 dim',
	min6: 'm6 dim',
	dom7: '7 dim',
	dom7b5: '7b5 dim',
	octatonic: ' oct',
};

export function shortName(scale: BarryHarrisScale, acc: Accidentals = 'flat'): string {
	return spellRoot(scale.root, acc) + SUFFIX[scale.type];
}
