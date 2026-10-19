import { describe, it, expect } from 'vitest';
import { ALL_SCALES } from './scales';

describe('ALL_SCALES', () => {
	it('has 45 scales', () => {
		expect(ALL_SCALES).toHaveLength(45);
	});

	it('C Maj6 Diminished is C D E F G Ab A B', () => {
		const s = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
		expect(s.chroma).toBe('101011011101');
	});

	it('every scale has 8 notes', () => {
		for (const s of ALL_SCALES) {
			expect(s.chroma.split('').filter(c => c === '1')).toHaveLength(8);
		}
	});
});
