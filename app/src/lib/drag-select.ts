import type { NoteInfo } from './notes-index';
import { spanFromNotes } from './notes-index';
import type { Selection } from './regions';

const CLICK_TOLERANCE = 3;   // px in wrapper coords: below this, treat as a click
const HIT_PAD = 2;

function toLocal(ev: PointerEvent, el: SVGGraphicsElement): DOMPoint {
	const ctm = el.getScreenCTM();
	if (!ctm) return new DOMPoint(0, 0);
	return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
}

function lineWrappers(svg: SVGSVGElement): Map<number, SVGGElement> {
	const map = new Map<number, SVGGElement>();
	for (const g of svg.querySelectorAll<SVGGElement>('g.abcjs-staff-wrapper')) {
		const m = /abcjs-l(\d+)/.exec(g.getAttribute('class') ?? '');
		if (m) map.set(Number(m[1]), g);
	}
	return map;
}

/** Pick the line whose wrapper is vertically closest to the pointer. */
function lineAt(ev: PointerEvent, wrappers: Map<number, SVGGElement>): { line: number; wrapper: SVGGElement } | null {
	let best: { line: number; wrapper: SVGGElement; dist: number } | null = null;
	for (const [line, wrapper] of wrappers) {
		const p = toLocal(ev, wrapper);
		const b = wrapper.getBBox();
		const dist = p.y < b.y ? b.y - p.y : p.y > b.y + b.height ? p.y - (b.y + b.height) : 0;
		if (!best || dist < best.dist) best = { line, wrapper, dist };
	}
	return best;
}

export type DragSelectHandlers = {
	onChange: (sel: Selection | null) => void;   // fires during drag and on click
};

/**
 * Attach pointer handlers to the abcjs SVG. Returns a cleanup function.
 * Elements with class `ps-label` are ignored so region labels stay clickable.
 */
export function attachDragSelect(svg: SVGSVGElement, notes: NoteInfo[], handlers: DragSelectHandlers): () => void {
	svg.style.touchAction = 'none';
	svg.style.userSelect = 'none';
	let wrappers = lineWrappers(svg);
	let drag: { line: number; wrapper: SVGGElement; x0: number; moved: boolean } | null = null;
	let lastKey = '';

	function emit(sel: Selection | null) {
		const key = sel ? `${sel.line}:${sel.start}:${sel.end}` : '';
		if (key === lastKey) return;
		lastKey = key;
		handlers.onChange(sel);
	}

	function hits(line: number, xa: number, xb: number): NoteInfo[] {
		const lo = Math.min(xa, xb) - HIT_PAD, hi = Math.max(xa, xb) + HIT_PAD;
		return notes.filter(n => n.line === line && n.cx >= lo && n.cx <= hi);
	}

	function down(ev: PointerEvent) {
		if (ev.button !== 0) return;
		if ((ev.target as Element).closest('.ps-label')) return;
		wrappers = lineWrappers(svg);
		const at = lineAt(ev, wrappers);
		if (!at) return;
		drag = { line: at.line, wrapper: at.wrapper, x0: toLocal(ev, at.wrapper).x, moved: false };
		lastKey = '';
		svg.setPointerCapture(ev.pointerId);
		ev.preventDefault();
	}

	function move(ev: PointerEvent) {
		if (!drag) return;
		const x = toLocal(ev, drag.wrapper).x;
		if (Math.abs(x - drag.x0) > CLICK_TOLERANCE) drag.moved = true;
		if (drag.moved) emit(spanFromNotes(hits(drag.line, drag.x0, x)));
	}

	function up(ev: PointerEvent) {
		if (!drag) return;
		const x = toLocal(ev, drag.wrapper).x;
		if (drag.moved) {
			emit(spanFromNotes(hits(drag.line, drag.x0, x)));
		} else {
			// click: select the single nearest note under the pointer, or clear
			const line = drag.line;
			const near = notes
				.filter(n => n.line === line && Math.abs(n.cx - x) <= n.bbox.width / 2 + HIT_PAD)
				.sort((a, b) => Math.abs(a.cx - x) - Math.abs(b.cx - x))[0];
			emit(near ? { line: near.line, start: near.onset, end: near.onset } : null);
		}
		if (svg.hasPointerCapture(ev.pointerId)) svg.releasePointerCapture(ev.pointerId);
		drag = null;
	}

	svg.addEventListener('pointerdown', down);
	svg.addEventListener('pointermove', move);
	svg.addEventListener('pointerup', up);
	svg.addEventListener('pointercancel', up);
	return () => {
		svg.removeEventListener('pointerdown', down);
		svg.removeEventListener('pointermove', move);
		svg.removeEventListener('pointerup', up);
		svg.removeEventListener('pointercancel', up);
	};
}
