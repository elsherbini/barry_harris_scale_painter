import { Pcset, Scale } from 'tonal';

export type KeyCenter = { root: string; mode: string };

const ABC_MODES: Record<string, string> = {
	'': 'major', Ion: 'major', m: 'minor', Aeo: 'minor',
	Dor: 'dorian', Phr: 'phrygian', Lyd: 'lydian', Mix: 'mixolydian', Loc: 'locrian',
};

/** abcjs tune.getKeySignature() -> { root, acc, mode } */
export function keyFromAbc(sig: { root?: string; acc?: string; mode?: string }): KeyCenter | null {
	if (!sig.root || sig.root === 'none' || sig.root === 'HP' || sig.root === 'Hp') return null;
	const mode = ABC_MODES[sig.mode ?? ''];
	if (!mode) return null;
	return { root: sig.root + (sig.acc ?? ''), mode };
}

export function keyChroma(key: KeyCenter | null): string | null {
	if (!key) return null;
	const notes = Scale.get(key.root + ' ' + key.mode).notes;
	if (!notes.length) return null;
	return Pcset.chroma(notes);
}

export function keyNotes(key: KeyCenter | null): string[] {
	if (!key) return [];
	return Scale.get(key.root + ' ' + key.mode).notes;
}

const MAJOR_MODES = Scale.modeNames('major').map(m => m[1]);
const OTHER_MAJOR = MAJOR_MODES.filter(m => m !== 'major' && m !== 'minor');
export const MODE_OPTIONS: string[] = [
	'major', 'minor',
	...OTHER_MAJOR,
	...Scale.modeNames('harmonic minor').map(m => m[1]),
	...Scale.modeNames('melodic minor').map(m => m[1]),
];

export const ROOT_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
