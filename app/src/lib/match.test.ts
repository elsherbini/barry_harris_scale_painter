import { describe, it, expect } from 'vitest';
import { matchScales, pitchClassesOf } from './match';
import { ALL_SCALES } from './scales';
import { Pcset, Scale } from 'tonal';

const C_MAJOR = Pcset.chroma(Scale.get('C major').notes);

describe('pitchClassesOf', () => {
	it('dedupes and sorts midi numbers into pitch classes', () => {
		expect(pitchClassesOf([60, 64, 67, 72, 61])).toEqual([0, 1, 4, 7]);
	});
});

describe('matchScales', () => {
	it('returns no groups for an empty selection', () => {
		expect(matchScales([], ALL_SCALES, null)).toEqual([]);
	});

	it('puts perfect fits in the 0-missing group', () => {
		const groups = matchScales([0, 4, 7, 9], ALL_SCALES, null);
		expect(groups[0].missing).toBe(0);
		const names = groups[0].matches.map(m => m.scale.name);
		expect(names).toContain('C Maj6 Diminished');
		expect(names).toContain('F Maj6 Diminished');
	});

	it('reports hits and misses per scale', () => {
		const groups = matchScales([0, 4, 7, 9, 1], ALL_SCALES, null);
		const c6 = groups.flatMap(g => g.matches).find(m => m.scale.name === 'C Maj6 Diminished')!;
		expect(c6.hits).toEqual([0, 4, 7, 9]);
		expect(c6.misses).toEqual([1]);
	});

	it('groups are ordered by missing count ascending and are non-empty', () => {
		const groups = matchScales([0, 1, 2, 3, 4, 5, 6, 7, 8], ALL_SCALES, null);
		expect(groups[0].missing).toBeGreaterThan(0);
		for (let i = 1; i < groups.length; i++) expect(groups[i].missing).toBeGreaterThan(groups[i - 1].missing);
		for (const g of groups) expect(g.matches.length).toBeGreaterThan(0);
	});

	it('sorts within a group by key overlap when a key is given', () => {
		const groups = matchScales([0, 4, 7], ALL_SCALES, C_MAJOR);
		const overlaps = groups[0].matches.map(m => m.keyOverlap!);
		for (let i = 1; i < overlaps.length; i++) expect(overlaps[i]).toBeLessThanOrEqual(overlaps[i - 1]);
		expect(groups[0].matches[0].scale.name).toBe('C Maj6 Diminished');
	});

	it('sorts within a group by type then root when no key is given', () => {
		const groups = matchScales([0], ALL_SCALES, null);
		const types = groups[0].matches.map(m => m.scale.type);
		const order = ['maj6', 'min6', 'dom7', 'dom7b5', 'octatonic'];
		const ranks = types.map(t => order.indexOf(t));
		for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
	});
});
