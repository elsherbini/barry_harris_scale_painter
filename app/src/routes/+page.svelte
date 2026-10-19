<script lang="ts">
	import StaffView, { type ColorMode, type RenderInfo } from '$lib/StaffView.svelte';
	import type { Accidentals } from '$lib/spelling';
	import KeySelector from '$lib/KeySelector.svelte';
	import CandidateList from '$lib/CandidateList.svelte';
	import RegionList from '$lib/RegionList.svelte';
	import Playback from '$lib/Playback.svelte';
	import { DEFAULT_ABC } from '$lib/abc';
	import { keyFromAbc, keyChroma, respellKey, type KeyCenter } from '$lib/key';
	import { matchScales } from '$lib/match';
	import { ALL_SCALES } from '$lib/scales';
	import { notesInSpan, selectedPitchClasses, lineOnsets, type NoteInfo } from '$lib/notes-index';
	import { applyRegion, newRegionId, sameSpan, type Region, type Selection } from '$lib/regions';

	type View = 'traditional' | 'diminished' | 'side-by-side';
	const VIEWS: View[] = ['traditional', 'diminished', 'side-by-side'];
	const COLOR_MODES: ColorMode[] = ['metaharmony', 'bw', 'elements'];

	let abc = $state(DEFAULT_ABC);
	let view = $state<View>('traditional');
	let colorMode = $state<ColorMode>('bw');
	let accidentals = $state<Accidentals>('flat');
	let editorOpen = $state(true);

	let regions = $state<Region[]>([]);
	let selection = $state<Selection | null>(null);
	let previewScaleName = $state<string | null>(null);

	let notes = $state.raw<NoteInfo[]>([]);
	let abcKey = $state<KeyCenter | null>(null);
	let keyOverride = $state<KeyCenter | 'none' | null>(null);
	let effectiveKey = $derived(keyOverride === 'none' ? null : (keyOverride ?? abcKey));
	let effectiveKeyChroma = $derived(keyChroma(effectiveKey));

	let trebleRender = $state.raw<RenderInfo | null>(null);
	let dimRender = $state.raw<RenderInfo | null>(null);
	let primary = $derived(view === 'diminished' ? dimRender : trebleRender);
	let secondary = $derived(view === 'side-by-side' ? dimRender : null);

	$effect(() => {
		if (view === 'diminished') trebleRender = null;
		if (view === 'traditional') dimRender = null;
	});

	let selectedNotes = $derived(notesInSpan(notes, selection));
	let selectedPcs = $derived(selectedPitchClasses(selectedNotes));
	let groups = $derived(matchScales(selectedPcs, ALL_SCALES, effectiveKeyChroma));
	let currentRegion = $derived(selection ? regions.find(r => sameSpan(r, selection)) ?? null : null);

	function afterRender(info: RenderInfo) {
		abcKey = keyFromAbc(info.tune.getKeySignature());
		notes = info.notes;
		// Drop regions that no longer point at notes (the ABC was edited).
		const kept = regions.filter(r => notesInSpan(info.notes, r).length > 0);
		if (kept.length !== regions.length) regions = kept;
		if (selection && notesInSpan(info.notes, selection).length === 0) selection = null;
	}

	function applyScale(scaleName: string) {
		if (!selection) return;
		regions = applyRegion(regions, { ...selection, id: newRegionId(), scaleName }, lineOnsets(notes, selection.line));
		previewScaleName = null;
		selection = null;
	}

	function setAccidentals(acc: Accidentals) {
		accidentals = acc;
		keyOverride = respellKey(keyOverride, acc);   // a chosen Db minor becomes C# minor, the ABC key stays as written
	}

	function selectRegion(id: string) {
		const r = regions.find(r => r.id === id);
		if (r) selection = { line: r.line, start: r.start, end: r.end };
	}

	function deleteRegion(id: string) {
		const wasCurrent = currentRegion?.id === id;   // read before the filter, which would reset currentRegion
		regions = regions.filter(r => r.id !== id);
		if (wasCurrent) selection = null;
	}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { selection = null; previewScaleName = null; } }} />

<main class="max-w-7xl mx-auto p-4 space-y-4">
	<header class="flex items-baseline gap-6">
		<h1 class="text-2xl font-bold">Painting Scales</h1>
		<button class="text-sm underline" onclick={() => (editorOpen = !editorOpen)}>
			{editorOpen ? 'Hide editor' : 'Show editor'}
		</button>
	</header>

	{#if editorOpen}
		<textarea class="w-full h-40 font-mono text-sm p-2 border rounded bg-white" bind:value={abc}></textarea>
	{/if}

	<div class="flex flex-wrap gap-4 items-center text-sm">
		<div class="flex gap-1">
			{#each VIEWS as v}
				<button class="px-3 py-1 border rounded" class:bg-neutral-800={view === v} class:text-white={view === v} onclick={() => (view = v)}>{v}</button>
			{/each}
		</div>
		<div class="flex gap-1 items-center">
			<span class="text-neutral-500">Colors:</span>
			{#each COLOR_MODES as m}
				<button class="px-3 py-1 border rounded" class:bg-neutral-800={colorMode === m} class:text-white={colorMode === m} onclick={() => (colorMode = m)}>{m}</button>
			{/each}
		</div>
		<Playback {primary} {secondary} />
	</div>

	<div class="grid gap-4" style="grid-template-columns: minmax(0, 1fr) 320px;">
		<div class="space-y-4">
			{#if view !== 'diminished'}
				<StaffView {abc} clef="treble" {colorMode} {regions} {selection} {previewScaleName} {accidentals}
					onSelect={(s) => (selection = s)} onLabelClick={selectRegion} onLabelDelete={deleteRegion}
					onRendered={(info) => { trebleRender = info; afterRender(info); }} />
			{/if}
			{#if view !== 'traditional'}
				<StaffView {abc} clef="diminished" {colorMode} {regions} {selection} {previewScaleName} {accidentals}
					onSelect={(s) => (selection = s)} onLabelClick={selectRegion} onLabelDelete={deleteRegion}
					onRendered={(info) => { dimRender = info; afterRender(info); }} />
			{/if}
		</div>
		<aside class="border rounded p-3 text-sm bg-white space-y-3 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
			<div class="flex items-center gap-1">
				<span class="text-neutral-500 mr-1">Spelling:</span>
				{#each [['flat', '♭'], ['sharp', '♯']] as [acc, glyph]}
					<button class="px-2 py-0.5 border rounded" class:bg-neutral-800={accidentals === acc} class:text-white={accidentals === acc}
						aria-label={acc === 'flat' ? 'Spell with flats' : 'Spell with sharps'} aria-pressed={accidentals === acc}
						onclick={() => setAccidentals(acc as Accidentals)}>{glyph}</button>
				{/each}
			</div>
			<KeySelector {abcKey} override={keyOverride} {accidentals} onChange={(k) => (keyOverride = k)} />
			<hr />
			{#if selection && selectedPcs.length}
				<CandidateList {groups} {selectedPcs} {accidentals} hasKey={!!effectiveKeyChroma}
					currentScaleName={currentRegion?.scaleName ?? null}
					onHover={(n) => (previewScaleName = n)} onApply={applyScale} />
			{:else}
				<RegionList {regions} {accidentals}
					onSelect={(r) => (selection = { line: r.line, start: r.start, end: r.end })}
					onDelete={deleteRegion} />
			{/if}
		</aside>
	</div>
</main>
