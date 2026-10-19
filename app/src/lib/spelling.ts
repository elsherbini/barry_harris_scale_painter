import { Note } from 'tonal';
import type { BarryHarrisScale } from './scales';

/** Whether black keys are written as flats (Db) or sharps (C#) throughout the UI. */
export type Accidentals = 'flat' | 'sharp';

export function pcName(pc: number, acc: Accidentals): string {
	const midi = 60 + (((pc % 12) + 12) % 12);
	return Note.pitchClass(acc === 'sharp' ? Note.fromMidiSharps(midi) : Note.fromMidi(midi));
}

/** Respell a root so its accidental matches `acc`; naturals are returned unchanged. */
export function spellRoot(root: string, acc: Accidentals): string {
	const wrong = acc === 'sharp' ? 'b' : '#';
	return root.includes(wrong) ? Note.enharmonic(root) : root;
}

export function samePitchClass(a: string, b: string): boolean {
	return Note.chroma(a) === Note.chroma(b);
}

/** The scale's full name with its root respelled, e.g. "D# Maj6 Diminished". */
export function scaleDisplayName(scale: BarryHarrisScale, acc: Accidentals): string {
	return spellRoot(scale.root, acc) + scale.name.slice(scale.root.length);
}
