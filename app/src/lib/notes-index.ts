import { pitchClassesOf } from './match';
import type { Span } from './regions';

export type NoteInfo = {
	line: number;
	staff: number;
	voice: number;
	onset: number;          // whole-note units, from abcjs midiPitches[0].start (rests: running time of the voice)
	rest: boolean;          // a visible rest: selectable and paintable, but contributes no pitches
	midi: number[];
	pcs: number[];
	svgEl: SVGGraphicsElement;
	cx: number;             // x-center of the note group's bbox, in the SVG user coords
	bbox: DOMRect;
};

const EPS = 1e-6;

export function indexTune(tune: any): NoteInfo[] {
	const notes: NoteInfo[] = [];
	// abcjs only stamps timing on sounding notes. Rests get the running time of their voice,
	// which is re-synced at every sounding note so it survives repeats and tuplets.
	const clocks = new Map<string, number>();
	for (let l = 0; l < tune.lines.length; l++) {
		const line = tune.lines[l];
		if (!line.staff) continue;
		line.staff.forEach((staff: any, s: number) => {
			staff.voices.forEach((voice: any[], v: number) => {
				const key = `${s}:${v}`;
				let t = clocks.get(key) ?? 0;
				for (const el of voice) {
					if (el.el_type !== 'note') continue;
					const sounding = !el.rest && el.midiPitches && el.midiPitches.length > 0;
					if (sounding) t = el.midiPitches[0].start;
					const onset = t;
					t += el.duration ?? 0;
					if (!sounding && !el.rest) continue;        // tied continuation: nothing new to select
					const svgEl = el.abselem?.elemset?.[0] as SVGGraphicsElement | undefined;
					if (!svgEl) continue;                        // invisible rests and spacers draw nothing
					const bbox = svgEl.getBBox();
					const midi: number[] = sounding ? el.midiPitches.map((p: any) => p.pitch as number) : [];
					notes.push({
						line: l, staff: s, voice: v,
						onset,
						rest: !sounding,
						midi,
						pcs: pitchClassesOf(midi),
						svgEl,
						cx: bbox.x + bbox.width / 2,
						bbox,
					});
				}
				clocks.set(key, t);
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
