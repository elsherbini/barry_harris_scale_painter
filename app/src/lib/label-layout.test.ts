import { describe, it, expect } from 'vitest';
import { intersects, placeAbove } from './label-layout';

describe('intersects', () => {
	it('detects overlap and ignores edge-touching boxes', () => {
		expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
		expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
		expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 10, width: 10, height: 10 })).toBe(false);
	});
});

describe('placeAbove', () => {
	const label = { x: 10, y: 100, width: 30, height: 12 };

	it('keeps the label where it is when nothing is in the way', () => {
		expect(placeAbove(label, [{ x: 200, y: 100, width: 20, height: 12 }], 13)).toEqual(label);
	});

	it('moves up one step when a dynamic marking sits under the label', () => {
		const dyn = { x: 15, y: 102, width: 10, height: 8 };
		expect(placeAbove(label, [dyn], 13)).toEqual({ ...label, y: 87 });
	});

	it('keeps moving up past stacked obstacles', () => {
		const a = { x: 15, y: 102, width: 10, height: 8 };
		const b = { x: 15, y: 88, width: 10, height: 8 };
		expect(placeAbove(label, [a, b], 13)).toEqual({ ...label, y: 74 });
	});

	it('lets two neighbouring labels dodge each other vertically', () => {
		const first = placeAbove(label, [], 13);
		const second = placeAbove({ x: 30, y: 100, width: 30, height: 12 }, [first], 13);
		expect(second.y).toBe(87);
		const third = placeAbove({ x: 35, y: 100, width: 30, height: 12 }, [first, second], 13);
		expect(third.y).toBe(74);
	});

	it('does not move a label whose neighbour is far enough to the right', () => {
		const first = placeAbove(label, [], 13);
		const second = placeAbove({ x: 40, y: 100, width: 30, height: 12 }, [first], 13);
		expect(second.y).toBe(100);
	});
});
