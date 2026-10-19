// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';

// jsdom has no layout engine; abcjs only needs getBBox to return something box-shaped.
beforeAll(() => {
	(SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 });
});

const METAHARMONY = { cDim: 'rgb(215 204 59)', bbDim: 'rgb(216 37 84)', bDim: 'rgb(77 162 210)' };

async function noteheadFills(abc: string, options: Record<string, unknown>): Promise<(string | null)[]> {
	const mod: any = await import('abcjs');
	const ABCJS = mod.default ?? mod;
	const div = document.createElement('div');
	document.body.appendChild(div);
	ABCJS.renderAbc(div, abc, { add_classes: true, ...options });
	return [...div.querySelectorAll<SVGElement>('.abcjs-notehead')].map(e => e.getAttribute('fill'));
}

describe('colorNoteheads render option', () => {
	// In Eb major: Eb (3) -> cDim, B is Bb (10) -> bbDim, then explicit B natural (11) -> bDim,
	// and after the bar line B is Bb again.
	const abc = 'X:1\nK:Eb\nE2 B2 =B2 | B4 |';

	it('leaves treble noteheads uncolored by default', async () => {
		const fills = await noteheadFills(abc, {});
		expect(fills).toEqual([null, null, null, null]);
	});

	it('colors treble noteheads by diminished family, resolving key and bar accidentals', async () => {
		const fills = await noteheadFills(abc, { colorNoteheads: true });
		expect(fills).toEqual([METAHARMONY.cDim, METAHARMONY.bbDim, METAHARMONY.bDim, METAHARMONY.bbDim]);
	});

	it('honors the diminishedColors palette on treble noteheads', async () => {
		const fills = await noteheadFills('X:1\nK:C\nC2 |', { colorNoteheads: true, diminishedColors: 'elements' });
		expect(fills).toEqual(['rgb(59 179 75)']);
	});

	it('colors accidentals to match their notehead', async () => {
		const mod: any = await import('abcjs');
		const ABCJS = mod.default ?? mod;
		const div = document.createElement('div');
		document.body.appendChild(div);
		// ^C -> Db (1) bbDim, _E -> Eb (3) cDim, =B -> B (11) bDim, ^^F -> G (7) bbDim
		ABCJS.renderAbc(div, 'X:1\nK:C\n^C2 _E2 =B2 ^^F2 |', { add_classes: true, colorNoteheads: true });
		const accidentals = [...div.querySelectorAll<SVGElement>('[data-name^="accidentals."]')].map(e => e.getAttribute('fill'));
		expect(accidentals).toEqual([METAHARMONY.bbDim, METAHARMONY.cDim, METAHARMONY.bDim, METAHARMONY.bbDim]);
	});

	it('leaves accidentals uncolored by default', async () => {
		const mod: any = await import('abcjs');
		const ABCJS = mod.default ?? mod;
		const div = document.createElement('div');
		document.body.appendChild(div);
		ABCJS.renderAbc(div, 'X:1\nK:C\n^C2 |', { add_classes: true });
		const accidentals = [...div.querySelectorAll<SVGElement>('[data-name^="accidentals."]')].map(e => e.getAttribute('fill'));
		expect(accidentals).toEqual([null]);
	});

	function renderColored(ABCJS: any, key: string) {
		const div = document.createElement('div');
		document.body.appendChild(div);
		ABCJS.renderAbc(div, `X:1\n${key}\n^C2 _E4 B8 |`, { add_classes: true, colorNoteheads: true });
		const els = [...div.querySelectorAll<SVGElement>('.abcjs-notehead, [data-name^="accidentals."]')];
		expect(els.length).toBeGreaterThan(0);
		return els.map(e => ({ fill: e.getAttribute('fill'), stroke: e.getAttribute('stroke') ?? e.closest('g[stroke]')?.getAttribute('stroke') ?? null }));
	}

	it('colors treble glyphs with fill only, so they keep their size', async () => {
		const mod: any = await import('abcjs');
		for (const g of renderColored(mod.default ?? mod, 'K:C')) {
			expect(g.fill).not.toBeNull();
			expect(g.stroke === null || g.stroke === 'none').toBe(true);
		}
	});

	it('keeps the matching stroke on diminished staff glyphs, which were drawn to need it', async () => {
		const mod: any = await import('abcjs');
		for (const g of renderColored(mod.default ?? mod, 'K:C clef=diminished')) {
			expect(g.fill).not.toBeNull();
			expect(g.stroke).toBe(g.fill);
		}
	});

	it('keeps round noteheads on the treble clef when colored', async () => {
		const mod: any = await import('abcjs');
		const ABCJS = mod.default ?? mod;
		const div = document.createElement('div');
		document.body.appendChild(div);
		const dimDiv = document.createElement('div');
		document.body.appendChild(dimDiv);
		ABCJS.renderAbc(div, 'X:1\nK:C\nC2 |', { add_classes: true, colorNoteheads: true });
		ABCJS.renderAbc(dimDiv, 'X:1\nK:C clef=diminished\nC2 |', { add_classes: true });
		const treble = div.querySelector('.abcjs-notehead')!.getAttribute('d');
		const dim = dimDiv.querySelector('.abcjs-notehead')!.getAttribute('d');
		expect(treble).not.toEqual(dim);
	});
});
