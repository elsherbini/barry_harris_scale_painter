import type { NoteInfo } from './notes-index';
import { notesInSpan } from './notes-index';
import type { Region, Selection } from './regions';
import { scaleColor, shortName, textColorOn } from './colors';
import { ALL_SCALES } from './scales';
import { placeAbove, type Box } from './label-layout';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD_Y = 4;
const PAD_X = 3;
const SELECTION_COLOR = '#0a9ecc';
const LABEL_FONT_SIZE = 11;
const LABEL_PAD_X = 6;        // horizontal padding inside the pill
const LABEL_HEIGHT = 16;      // pill height
const LABEL_GAP = 3;          // gap between pill bottom and the staff / obstacle below
const LABEL_STEP = LABEL_HEIGHT + LABEL_GAP;

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

/** Bounding boxes of everything abcjs drew in the wrapper (overlays excluded). */
function obstacleBoxes(wrapper: SVGGElement): Box[] {
	const boxes: Box[] = [];
	for (const e of wrapper.querySelectorAll<SVGGraphicsElement>('text, path, rect, circle, ellipse, line, polygon')) {
		if (e.classList.contains('ps-overlay')) continue;
		const b = e.getBBox();
		if (b.width === 0 && b.height === 0) continue;
		boxes.push({ x: b.x, y: b.y, width: b.width, height: b.height });
	}
	return boxes;
}

/**
 * Draws a region label as a colored pill, starting just above the staff and moving up only as far
 * as needed to clear abcjs content (dynamics, chord symbols, high notes) and earlier labels.
 */
function drawLabel(
	wrapper: SVGGElement, x: number, staffTopY: number, region: Region, color: string,
	obstacles: Box[], onClick?: (id: string) => void
): Box {
	const scale = ALL_SCALES.find(s => s.name === region.scaleName);
	const group = el('g', { 'data-region': region.id });
	group.classList.add('ps-label');
	group.style.cursor = 'pointer';
	const text = el('text', {
		x: x + LABEL_PAD_X, y: 0, fill: textColorOn(color), 'font-size': LABEL_FONT_SIZE, 'font-weight': 700,
		'font-family': 'system-ui, sans-serif', 'dominant-baseline': 'central',
	});
	text.textContent = scale ? shortName(scale) : region.scaleName;
	const pill = el('rect', { x, y: 0, width: 0, height: LABEL_HEIGHT, rx: LABEL_HEIGHT / 2, fill: color });
	group.append(pill, text);
	if (onClick) group.addEventListener('click', () => onClick(region.id));
	wrapper.appendChild(group);
	const width = text.getBBox().width + 2 * LABEL_PAD_X;
	const wanted: Box = { x, y: staffTopY - LABEL_GAP - LABEL_HEIGHT, width, height: LABEL_HEIGHT };
	const placed = placeAbove(wanted, obstacles, LABEL_STEP);
	pill.setAttribute('width', String(width));
	pill.setAttribute('y', String(placed.y));
	text.setAttribute('y', String(placed.y + LABEL_HEIGHT / 2));
	return placed;
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
	// Obstacles per line, measured before any overlays are added. Labels placed on a line
	// are appended so later labels on the same line dodge earlier ones.
	const obstacles = new Map<number, Box[]>();
	const obstaclesFor = (line: number, wrapper: SVGGElement) => {
		let o = obstacles.get(line);
		if (!o) { o = obstacleBoxes(wrapper); obstacles.set(line, o); }
		return o;
	};
	for (const region of input.regions) {
		const spanNotes = notesInSpan(input.notes, region);
		const color = scaleColor(region.scaleName);
		const band = drawBand(svg, region.line, spanNotes, color, 0.3, false, region.id);
		if (!band) continue;
		const lineObstacles = obstaclesFor(region.line, band.wrapper);
		const placed = drawLabel(band.wrapper, band.x, band.topY, region, color, lineObstacles, input.onLabelClick);
		lineObstacles.push(placed);
		const scale = ALL_SCALES.find(s => s.name === region.scaleName);
		if (scale) drawOutsideRings(band.wrapper, spanNotes, scale.chroma);
	}
	if (input.selection) {
		const spanNotes = notesInSpan(input.notes, input.selection);
		const color = input.previewScaleName ? scaleColor(input.previewScaleName) : SELECTION_COLOR;
		drawBand(svg, input.selection.line, spanNotes, color, input.previewScaleName ? 0.3 : 0.15, true, 'selection');
	}
}
