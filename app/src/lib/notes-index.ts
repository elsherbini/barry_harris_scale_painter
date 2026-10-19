import { pitchClassesOf } from './match';
import type { Span } from './regions';

export type NoteInfo = {
	line: number;
	staff: number;
	voice: number;
	onset: number;          // seconds, from abcjs midiPitches[0].start
	midi: number[];
	pcs: number[];
	svgEl: SVGGraphicsElement;
	cx: number;             // x-center of the note group's bbox, in the SVG user coords
	bbox: DOMRect;
};

const EPS = 1e-6;

export function indexTune(tune: any): NoteInfo[] {
	const notes: NoteInfo[] = [];
	for (let l = 0; l < tune.lines.length; l++) {
		const line = tune.lines[l];
		if (!line.staff) continue;
		line.staff.forEach((staff: any, s: number) => {
			staff.voices.forEach((voice: any[], v: number) => {
				for (const el of voice) {
					if (el.el_type !== 'note' || el.rest) continue;
					if (!el.midiPitches || el.midiPitches.length === 0) continue;
					const svgEl = el.abselem?.elemset?.[0] as SVGGraphicsElement | undefined;
					if (!svgEl) continue;
					const bbox = svgEl.getBBox();
					const midi = el.midiPitches.map((p: any) => p.pitch as number);
					notes.push({
						line: l, staff: s, voice: v,
						onset: el.midiPitches[0].start,
						midi,
						pcs: pitchClassesOf(midi),
						svgEl,
						cx: bbox.x + bbox.width / 2,
						bbox,
					});
				}
			});
		});
	}
	return notes;
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
