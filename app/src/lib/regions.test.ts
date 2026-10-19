import { describe, it, expect } from 'vitest';
import { applyRegion, prevOnset, nextOnset, type Region } from './regions';

const onsets = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
const r = (id: string, start: number, end: number, line = 0): Region =>
	({ id, line, start, end, scaleName: 'C Maj6 Diminished' });

describe('prevOnset / nextOnset', () => {
	it('finds the neighbors', () => {
		expect(prevOnset(onsets, 1)).toBe(0.5);
		expect(nextOnset(onsets, 1)).toBe(1.5);
		expect(prevOnset(onsets, 0)).toBeNull();
		expect(nextOnset(onsets, 3.5)).toBeNull();
	});
});

describe('applyRegion', () => {
	it('appends when nothing overlaps', () => {
		const out = applyRegion([r('a', 0, 1)], r('b', 2, 3), onsets);
		expect(out.map(x => x.id)).toEqual(['a', 'b']);
	});

	it('ignores regions on other lines', () => {
		const out = applyRegion([r('a', 0, 3, 1)], r('b', 0, 3, 0), onsets);
		expect(out).toHaveLength(2);
	});

	it('removes a fully covered region', () => {
		const out = applyRegion([r('a', 1, 2)], r('b', 0.5, 2.5), onsets);
		expect(out.map(x => x.id)).toEqual(['b']);
	});

	it('trims the right edge of a region that overlaps the start', () => {
		const out = applyRegion([r('a', 0, 2)], r('b', 1.5, 3), onsets);
		expect(out).toEqual([r('a', 0, 1), r('b', 1.5, 3)]);
	});

	it('trims the left edge of a region that overlaps the end', () => {
		const out = applyRegion([r('a', 1, 3)], r('b', 0, 1.5), onsets);
		expect(out).toEqual([r('a', 2, 3), r('b', 0, 1.5)]);
	});

	it('splits a region that contains the new one', () => {
		const out = applyRegion([r('a', 0, 3.5)], r('b', 1, 2), onsets);
		expect(out).toEqual([r('a', 0, 0.5), { ...r('a', 2.5, 3.5), id: 'a:2' }, r('b', 1, 2)]);
	});

	it('replaces a region with identical bounds', () => {
		const out = applyRegion([r('a', 1, 2)], { ...r('b', 1, 2), scaleName: 'G Min6 Diminished' }, onsets);
		expect(out).toHaveLength(1);
		expect(out[0].scaleName).toBe('G Min6 Diminished');
	});
});
