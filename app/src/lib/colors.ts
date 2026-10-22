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

/** How region labels are colored: the 12 Barry Harris families, or the 3 diminished chords. */
export type LabelColorMode = 'family' | 'dim';

// The abcjs fork's metaharmony palette, so labels match the diminished staff's noteheads.
export const DIM_COLORS = { c: '#d7cc3b', db: '#d82554', d: '#4da2d2' };
const DIM_BY_CHROMA = [DIM_COLORS.c, DIM_COLORS.db, DIM_COLORS.d];

/** Color of the dim7 chord the scale's root belongs to (C, Db or D diminished). */
const ROOT_DIM_COLORS: Record<string, string> = Object.fromEntries(
	ALL_SCALES.map(s => [s.name, DIM_BY_CHROMA[Note.chroma(s.root)! % 3]])
);

export function scaleColor(name: string, mode: LabelColorMode = 'family'): string {
	return (mode === 'dim' ? ROOT_DIM_COLORS : SCALE_COLORS)[name] ?? '#999999';
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
