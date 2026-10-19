// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { drawOverlays } from './overlay';
import type { NoteInfo } from './notes-index';
import type { Region } from './regions';

const SVG_NS = 'http://www.w3.org/2000/svg';

beforeAll(() => {
	(SVGElement.prototype as any).getBBox = function () {
		const x = Number(this.getAttribute('data-x') ?? 0);
		return { x, y: 0, width: 10, height: 10 };
	};
});

/** One system line with one staff and two notes, the way abcjs lays its SVG out. */
function fixture(): { svg: SVGSVGElement; notes: NoteInfo[] } {
	const svg = document.createElementNS(SVG_NS, 'svg');
	const wrapper = document.createElementNS(SVG_NS, 'g');
	wrapper.setAttribute('class', 'abcjs-staff-wrapper abcjs-l0');
	const staff = document.createElementNS(SVG_NS, 'g');
	staff.setAttribute('class', 'abcjs-staff');
	wrapper.append(staff);
	svg.append(wrapper);
	document.body.append(svg);
	const notes: NoteInfo[] = [10, 40].map((x, i) => {
		const g = document.createElementNS(SVG_NS, 'g');
		g.setAttribute('data-x', String(x));
		wrapper.append(g);
		return { line: 0, staff: 0, voice: 0, onset: i, rest: false, midi: [60], pcs: [0], svgEl: g, cx: x + 5, bbox: g.getBBox() as DOMRect };
	});
	return { svg, notes };
}

const region: Region = { id: 'r1', line: 0, start: 0, end: 1, scaleName: 'C Maj6 Diminished' };

describe('region label delete control', () => {
	it('is absent when the region is not the current selection', () => {
		const { svg, notes } = fixture();
		drawOverlays(svg, { notes, regions: [region], selection: null, previewScaleName: null });
		expect(svg.querySelector('.ps-label')).not.toBeNull();
		expect(svg.querySelector('.ps-label-delete')).toBeNull();
	});

	it('appears on the pill once its region is selected, and deletes on click without reselecting', () => {
		const { svg, notes } = fixture();
		const onLabelClick = vi.fn();
		const onLabelDelete = vi.fn();
		drawOverlays(svg, { notes, regions: [region], selection: { line: 0, start: 0, end: 1 }, previewScaleName: null, onLabelClick, onLabelDelete });
		const del = svg.querySelector<SVGElement>('.ps-label-delete');
		expect(del).not.toBeNull();
		del!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(onLabelDelete).toHaveBeenCalledWith('r1');
		expect(onLabelClick).not.toHaveBeenCalled();
	});

	it('still selects the region when the pill itself is clicked', () => {
		const { svg, notes } = fixture();
		const onLabelClick = vi.fn();
		drawOverlays(svg, { notes, regions: [region], selection: { line: 0, start: 0, end: 1 }, previewScaleName: null, onLabelClick, onLabelDelete: vi.fn() });
		svg.querySelector<SVGElement>('.ps-label text')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(onLabelClick).toHaveBeenCalledWith('r1');
	});

	it('spells the pill label with sharps when asked', () => {
		const { svg, notes } = fixture();
		const eb: Region = { ...region, scaleName: 'Eb Maj6 Diminished' };
		drawOverlays(svg, { notes, regions: [eb], selection: null, previewScaleName: null, accidentals: 'sharp' });
		expect(svg.querySelector('.ps-label text')!.textContent).toBe('D#6 dim');
	});
});
