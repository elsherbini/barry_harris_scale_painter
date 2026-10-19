import { describe, it, expect } from 'vitest';
import { indexTune, lineOnsets, notesInSpan, spanFromNotes } from './notes-index';

function fakeNote(x: number, start: number, pitches: number[], extra: Record<string, unknown> = {}) {
	return {
		el_type: 'note',
		duration: 0.5,
		midiPitches: pitches.map(p => ({ pitch: p, start })),
		abselem: { elemset: [{ getBBox: () => ({ x, y: 10, width: 10, height: 20 }) }] },
		...extra,
	};
}

function fakeRest(x: number, duration: number, type = 'rest') {
	return {
		el_type: 'note',
		rest: { type },
		duration,
		abselem: { elemset: type === 'invisible' ? [] : [{ getBBox: () => ({ x, y: 0, width: 5, height: 5 }) }] },
	};
}

const tune = {
	lines: [
		{ staff: [{ voices: [[
			fakeNote(10, 0, [60]),
			{ el_type: 'bar', abselem: { elemset: [] } },
			fakeNote(40, 0.5, [64, 67]),
			fakeNote(70, 1, [], { duration: 0.25 }),       // tied continuation: no midi pitches
			fakeRest(90, 0.25),                             // onset 1.25, after the continuation
			fakeRest(95, 0.25, 'invisible'),                // nothing drawn: not indexed
		]] }, { voices: [[
			fakeNote(12, 0, [48]),
			fakeRest(42, 0.5),                              // onset 0.5 on the second staff
		]] }] },
		{ nonMusic: {} },
		{ staff: [{ voices: [[ fakeNote(10, 2, [62]) ]] }] },
	],
};

describe('indexTune', () => {
	const notes = indexTune(tune as any);

	it('keeps sounding notes and visible rests, recording line/staff/voice', () => {
		expect(notes).toHaveLength(6);
		expect(notes.map(n => n.line)).toEqual([0, 0, 0, 0, 0, 2]);
		expect(notes.map(n => n.staff)).toEqual([0, 0, 0, 1, 1, 0]);
		expect(notes.map(n => n.rest)).toEqual([false, false, true, false, true, false]);
	});

	it('gives rests an onset from the running time of their voice, with no pitches', () => {
		const rests = notes.filter(n => n.rest);
		expect(rests.map(n => n.onset)).toEqual([1.25, 0.5]);
		expect(rests.map(n => n.cx)).toEqual([92.5, 44.5]);
		expect(rests.every(n => n.midi.length === 0 && n.pcs.length === 0)).toBe(true);
	});

	it('records onset, pitch classes and x-center', () => {
		expect(notes[1].onset).toBe(0.5);
		expect(notes[1].pcs).toEqual([4, 7]);
		expect(notes[1].cx).toBe(45);
	});

	it('lineOnsets gives sorted distinct onsets per line, rests included', () => {
		expect(lineOnsets(notes, 0)).toEqual([0, 0.5, 1.25]);
		expect(lineOnsets(notes, 2)).toEqual([2]);
	});

	it('notesInSpan returns all staves in the time range', () => {
		const hit = notesInSpan(notes, { line: 0, start: 0, end: 0 });
		expect(hit.map(n => n.midi[0])).toEqual([60, 48]);
	});

	it('notesInSpan includes rests so a span can end on one', () => {
		const hit = notesInSpan(notes, { line: 0, start: 0.5, end: 1.25 });
		expect(hit.map(n => n.rest)).toEqual([false, true, true]);
	});

	it('spanFromNotes gives the onset bounds', () => {
		expect(spanFromNotes(notes.slice(0, 3))).toEqual({ line: 0, start: 0, end: 1.25 });
		expect(spanFromNotes([])).toBeNull();
	});
});
