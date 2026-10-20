import { pitchClassesOf } from './match';
import type { Span } from './regions';

export type NoteInfo = {
	line: number;
	staff: number;
	voice: number;
	onset: number;          // whole-note units, from abcjs midiPitches[0].start (rests and tied continuations: running time of the voice)
	rest: boolean;          // a visible rest: selectable and paintable, but contributes no pitches
	midi: number[];         // sounding pitches, plus any pitch tied over from an earlier note in the voice
	pcs: number[];
	svgEl: SVGGraphicsElement;
	cx: number;             // x-center of the note group's bbox, in the SVG user coords
	bbox: DOMRect;
};

const EPS = 1e-6;

export function indexTune(tune: any): NoteInfo[] {
	const notes: NoteInfo[] = [];
	// abcjs only stamps timing on sounding notes. Rests and tied continuations get the running time of
	// their voice, which is re-synced at every sounding note so it survives repeats and tuplets.
	const clocks = new Map<string, number>();
	// abcjs gives a tied-to pitch no midiPitches entry, so remember each voice's sounding midi by
	// diatonic pitch number and carry it into the notes the tie reaches.
	const held = new Map<string, Map<number, number>>();
	for (let l = 0; l < tune.lines.length; l++) {
		const line = tune.lines[l];
		if (!line.staff) continue;
		line.staff.forEach((staff: any, s: number) => {
			staff.voices.forEach((voice: any[], v: number) => {
				const key = `${s}:${v}`;
				let t = clocks.get(key) ?? 0;
				let holding = held.get(key) ?? new Map<number, number>();
				for (const el of voice) {
					if (el.el_type !== 'note') continue;
					const sounding = !el.rest && el.midiPitches && el.midiPitches.length > 0;
					if (sounding) t = el.midiPitches[0].start;
					const onset = t;
					t += el.duration ?? 0;
					let midi: number[] = [];
					if (!el.rest) {
						const result = resolvePitches(el, holding);
						midi = result.midi;
						holding = result.holding;
					}
					const svgEl = el.abselem?.elemset?.[0] as SVGGraphicsElement | undefined;
					if (!svgEl) continue;                        // invisible rests and spacers draw nothing
					const bbox = svgEl.getBBox();
					notes.push({
						line: l, staff: s, voice: v,
						onset,
						rest: !!el.rest,
						midi,
						pcs: pitchClassesOf(midi),
						svgEl,
						cx: bbox.x + bbox.width / 2,
						bbox,
					});
				}
				clocks.set(key, t);
				held.set(key, holding);
			});
		});
	}
	return notes;
}

/**
 * The midi pitches of a note element in notehead order: fresh pitches from abcjs's midiPitches,
 * tied-in pitches from what the voice was holding. Returns the new holding map for the next note.
 */
function resolvePitches(el: any, holding: Map<number, number>): { midi: number[]; holding: Map<number, number> } {
	const pitches: any[] = (el.pitches ?? []).filter((p: any) => p);
	const fresh: number[] = (el.midiPitches ?? []).map((p: any) => p.pitch as number);
	const next = new Map<number, number>();
	const midi: number[] = [];
	let f = 0;
	for (const p of pitches) {
		const m = p.endTie ? holding.get(p.pitch) : fresh[f++];
		if (m === undefined) continue;
		midi.push(m);
		next.set(p.pitch, m);
	}
	// An element with midiPitches but no pitches array (seen in some synthetic tunes): use the fresh pitches as they are.
	if (!el.pitches && fresh.length) return { midi: fresh, holding: next };
	return { midi, holding: next };
}

export function lineOnsets(notes: NoteInfo[], line: number): number[] {
	const set = new Set(notes.filter(n => n.line === line).map(n => n.onset));
	return [...set].sort((a, b) => a - b);
}

export function notesInSpan(notes: NoteInfo[], span: Span | null): NoteInfo[] {
	if (!span) return [];
	return notes.filter(n => n.line === span.line && n.onset >= span.start - EPS && n.onset <= span.end + EPS);
}

export function spanFromNotes(notes: NoteInfo[]): Span | null {
	if (notes.length === 0) return null;
	let start = Infinity, end = -Infinity;
	for (const n of notes) { start = Math.min(start, n.onset); end = Math.max(end, n.onset); }
	return { line: notes[0].line, start, end };
}

export function selectedPitchClasses(notes: NoteInfo[]): number[] {
	return pitchClassesOf(notes.flatMap(n => n.midi));
}
