<script lang="ts">
	import type { Region } from '$lib/regions';
	import { scaleColor, shortName } from '$lib/colors';
	import { ALL_SCALES } from '$lib/scales';

	let {
		regions,
		onSelect,
		onDelete,
	}: {
		regions: Region[];
		onSelect: (region: Region) => void;
		onDelete: (regionId: string) => void;
	} = $props();

	let sorted = $derived([...regions].sort((a, b) => a.line - b.line || a.start - b.start));
	const nameOf = (r: Region) => { const s = ALL_SCALES.find(s => s.name === r.scaleName); return s ? shortName(s) : r.scaleName; };
</script>

<div class="space-y-2 text-sm">
	<h3 class="font-semibold">Labeled passages</h3>
	{#if sorted.length === 0}
		<p class="text-neutral-500">None yet. Drag across notes, then pick a scale.</p>
	{/if}
	<ul class="space-y-1">
		{#each sorted as r (r.id)}
			<li class="flex items-center gap-2 border rounded p-2" style="border-left: 6px solid {scaleColor(r.scaleName)}">
				<button class="flex-1 text-left" onclick={() => onSelect(r)}>
					<span class="font-medium">{nameOf(r)}</span>
					<span class="text-xs text-neutral-500 ml-2">line {r.line + 1}, {r.start.toFixed(1)}s to {r.end.toFixed(1)}s</span>
				</button>
				<button class="text-neutral-400 hover:text-red-600" title="Delete" onclick={() => onDelete(r.id)}>&times;</button>
			</li>
		{/each}
	</ul>
</div>
