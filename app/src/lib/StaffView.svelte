<script lang="ts" module>
	export type ColorMode = 'metaharmony' | 'bw' | 'elements';
	export type RenderInfo = { tune: any; notes: NoteInfo[]; container: HTMLDivElement };
	import type { NoteInfo } from '$lib/notes-index';
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { makeDimAbc } from '$lib/abc';
	import { indexTune } from '$lib/notes-index';
	import { attachDragSelect } from '$lib/drag-select';
	import { drawOverlays } from '$lib/overlay';
	import type { Region, Selection } from '$lib/regions';
	import type { Accidentals } from '$lib/spelling';

	let {
		abc,
		clef,
		colorMode = 'metaharmony',
		regions,
		selection,
		previewScaleName = null,
		accidentals = 'flat',
		onSelect,
		onLabelClick,
		onLabelDelete,
		onRendered,
	}: {
		abc: string;
		clef: 'treble' | 'diminished';
		colorMode?: ColorMode;
		regions: Region[];
		selection: Selection | null;
		previewScaleName?: string | null;
		accidentals?: Accidentals;
		onSelect: (sel: Selection | null) => void;
		onLabelClick?: (regionId: string) => void;
		onLabelDelete?: (regionId: string) => void;
		onRendered?: (info: RenderInfo) => void;
	} = $props();

	let container: HTMLDivElement;
	let ABCJS: any = $state(null);
	let notes = $state.raw<NoteInfo[]>([]);
	let renderCount = $state(0);

	$effect(() => {
		import('abcjs').then(mod => { ABCJS = mod.default ?? mod; });
	});

	// Render whenever abc / clef / colorMode / ABCJS change.
	$effect(() => {
		if (!ABCJS || !container) return;
		const source = clef === 'diminished' ? makeDimAbc(abc) : abc;
		const tune = ABCJS.renderAbc(container, source, {
			responsive: 'resize',
			add_classes: true,
			staffwidth: 760,
			diminishedColors: colorMode,
			colorNoteheads: true, // family colors on the traditional staff too, not only the diminished one
		})[0];
		if (!tune) return;
		tune.setUpAudio({});
		const idx = indexTune(tune);
		const svg = container.querySelector('svg') as SVGSVGElement | null;
		return untrack(() => {
			notes = idx;
			renderCount++;
			onRendered?.({ tune, notes: idx, container });
			if (!svg) return;
			return attachDragSelect(svg, idx, { onChange: (s) => onSelect(s) });
		});
	});

	// Redraw overlays whenever regions / selection / preview / spelling change or after a re-render.
	$effect(() => {
		renderCount;
		const currentNotes = notes;
		const input = { notes: currentNotes, regions, selection, previewScaleName, accidentals };
		if (!container) return;
		const svg = container.querySelector('svg') as SVGSVGElement | null;
		if (!svg) return;
		untrack(() => drawOverlays(svg, { ...input, onLabelClick: (id) => onLabelClick?.(id), onLabelDelete: (id) => onLabelDelete?.(id) }));
	});
</script>

<div class="staff-view" bind:this={container}></div>

<style>
	.staff-view :global(svg) { width: 100%; height: auto; display: block; }
	.staff-view :global(.abcjs-highlight) { fill: #0a9ecc; }
	.staff-view :global(.abcjs-cursor) { stroke: #f0295d; stroke-width: 2; opacity: 0.7; }
</style>
