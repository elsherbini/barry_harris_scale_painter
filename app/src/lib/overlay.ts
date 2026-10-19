import type { NoteInfo } from './notes-index';
import { notesInSpan } from './notes-index';
import type { Region, Selection } from './regions';
import { scaleColor, shortName } from './colors';
import { ALL_SCALES } from './scales';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD_Y = 4;
const PAD_X = 3;
const SELECTION_COLOR = '#0a9ecc';

export type OverlayInput = {
	notes: NoteInfo[];
	regions: Region[];
	selection: Selection | null;
	previewScaleName: string | null;   // hovered candidate: tints the selection in that color
	onLabelClick?: (regionId: string) => void;
};

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
	const e = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	e.classList.add('ps-overlay');
	return e;
}

function wrapperFor(svg: SVGSVGElement, line: number): SVGGElement | null {
	return svg.querySelector<SVGGElement>(`g.abcjs-staff-wrapper.abcjs-l${line}`);
}

/** Staff-line groups of a wrapper, top to bottom. */
function staffGroups(wrapper: SVGGElement): SVGGElement[] {
	return [...wrapper.querySelectorAll<SVGGElement>(':scope > g.abcjs-staff')]
		.sort((a, b) => a.getBBox().y - b.getBBox().y);
}

function xRange(notes: NoteInfo[]): { x: number; w: number } | null {
	if (notes.length === 0) return null;
	let x0 = Infinity, x1 = -Infinity;
	for (const n of notes) { x0 = Math.min(x0, n.bbox.x); x1 = Math.max(x1, n.bbox.x + n.bbox.width); }
	return { x: x0 - PAD_X, w: x1 - x0 + 2 * PAD_X };
}

function drawBand(
	svg: SVGSVGElement, line: number, spanNotes: NoteInfo[],
	color: string, opacity: number, dashed: boolean, dataId: string
): { wrapper: SVGGElement; x: number; topY: number } | null {
	const wrapper = wrapperFor(svg, line);
	const range = xRange(spanNotes);
	if (!wrapper || !range) return null;
	const groups = staffGroups(wrapper);
	let topY = Infinity;
	for (const g of groups) {
		const b = g.getBBox();
		topY = Math.min(topY, b.y);
		const rect = el('rect', {
			x: range.x, y: b.y - PAD_Y, width: range.w, height: b.height + 2 * PAD_Y,
			rx: 2, fill: color, 'fill-opacity': opacity,
			stroke: dashed ? color : 'none', 'stroke-dasharray': dashed ? '3 2' : 'none',
			'pointer-events': 'none', 'data-region': dataId,
		});
		g.after(rect);
	}
	if (topY === Infinity) return null;
	return { wrapper, x: range.x, topY };
}

function drawLabel(wrapper: SVGGElement, x: number, topY: number, region: Region, color: string, onClick?: (id: string) => void) {
	const scale = ALL_SCALES.find(s => s.name === region.scaleName);
	const text = el('text', {
		x, y: topY - 8, fill: color, 'font-size': 11, 'font-weight': 700,
		'font-family': 'system-ui, sans-serif', 'data-region': region.id,
	});
	text.classList.add('ps-label');
	text.style.cursor = 'pointer';
	text.textContent = scale ? shortName(scale) : region.scaleName;
	if (onClick) text.addEventListener('click', () => onClick(region.id));
	wrapper.appendChild(text);
}

function drawOutsideRings(wrapper: SVGGElement, spanNotes: NoteInfo[], chroma: string) {
	for (const n of spanNotes) {
		const heads = [...n.svgEl.querySelectorAll<SVGGraphicsElement>('.abcjs-notehead')];
		const perHead = heads.length === n.midi.length;
		const targets = perHead ? heads : [n.svgEl];
		targets.forEach((head, i) => {
			const pcs = perHead ? [((n.midi[i] % 12) + 12) % 12] : n.pcs;
			if (pcs.every(pc => chroma[pc] === '1')) return;
			const b = head.getBBox();
			wrapper.appendChild(el('circle', {
				cx: b.x + b.width / 2, cy: b.y + b.height / 2, r: Math.max(b.width, b.height) * 0.75,
				fill: 'none', stroke: '#d8254f', 'stroke-width': 1, 'pointer-events': 'none',
			}));
		});
	}
}

export function clearOverlays(svg: SVGSVGElement) {
	svg.querySelectorAll('.ps-overlay').forEach(e => e.remove());
}

export function drawOverlays(svg: SVGSVGElement, input: OverlayInput) {
	clearOverlays(svg);
	for (const region of input.regions) {
		const spanNotes = notesInSpan(input.notes, region);
		const color = scaleColor(region.scaleName);
		const band = drawBand(svg, region.line, spanNotes, color, 0.3, false, region.id);
		if (!band) continue;
		drawLabel(band.wrapper, band.x, band.topY, region, color, input.onLabelClick);
		const scale = ALL_SCALES.find(s => s.name === region.scaleName);
		if (scale) drawOutsideRings(band.wrapper, spanNotes, scale.chroma);
	}
	if (input.selection) {
		const spanNotes = notesInSpan(input.notes, input.selection);
		const color = input.previewScaleName ? scaleColor(input.previewScaleName) : SELECTION_COLOR;
		drawBand(svg, input.selection.line, spanNotes, color, input.previewScaleName ? 0.3 : 0.15, true, 'selection');
	}
}
