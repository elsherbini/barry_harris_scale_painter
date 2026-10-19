import { describe, it, expect } from 'vitest';
import { indexTune, lineOnsets, notesInSpan, spanFromNotes } from './notes-index';

function fakeNote(x: number, start: number, pitches: number[], extra: Record<string, unknown> = {}) {
	return {
		el_type: 'note',
		midiPitches: pitches.map(p => ({ pitch: p, start })),
		abselem: { elemset: [{ getBBox: () => ({ x, y: 10, width: 10, height: 20 }) }] },
		...extra,
	};
}

const tune = {
	lines: [
		{ staff: [{ voices: [[
			fakeNote(10, 0, [60]),
			{ el_type: 'bar', abselem: { elemset: [] } },
			fakeNote(40, 0.5, [64, 67]),
			fakeNote(70, 1, [], {}),                       // tied continuation: no midi pitches
			{ el_type: 'note', rest: {}, abselem: { elemset: [{ getBBox: () => ({ x: 90, y: 0, width: 5, height: 5 }) }] } },
		]] }, { voices: [[
			fakeNote(12, 0, [48]),
		]] }] },
		{ nonMusic: {} },
		{ staff: [{ voices: [[ fakeNote(10, 2, [62]) ]] }] },
	],
};

describe('indexTune', () => {
	const notes = indexTune(tune as any);

	it('keeps only sounding notes and records line/staff/voice', () => {
		expect(notes).toHaveLength(4);
		expect(notes.map(n => n.line)).toEqual([0, 0, 0, 2]);
		expect(notes.map(n => n.staff)).toEqual([0, 0, 1, 0]);
	});

	it('records onset, pitch classes and x-center', () => {
		expect(notes[1].onset).toBe(0.5);
		expect(notes[1].pcs).toEqual([4, 7]);
		expect(notes[1].cx).toBe(45);
	});

	it('lineOnsets gives sorted distinct onsets per line', () => {
		expect(lineOnsets(notes, 0)).toEqual([0, 0.5]);
		expect(lineOnsets(notes, 2)).toEqual([2]);
	});

	it('notesInSpan returns all staves in the time range', () => {
		const hit = notesInSpan(notes, { line: 0, start: 0, end: 0 });
		expect(hit.map(n => n.midi[0])).toEqual([60, 48]);
	});

	it('spanFromNotes gives the onset bounds', () => {
		expect(spanFromNotes(notes.slice(0, 3))).toEqual({ line: 0, start: 0, end: 0.5 });
		expect(spanFromNotes([])).toBeNull();
	});
});
