<script lang="ts">
	import type { MatchGroup, ScaleMatch } from '$lib/match';
	import { scaleColor, shortName } from '$lib/colors';
	import { Pcset } from 'tonal';

	let {
		groups,
		selectedPcs,
		hasKey,
		currentScaleName = null,
		onHover,
		onApply,
	}: {
		groups: MatchGroup[];
		selectedPcs: number[];
		hasKey: boolean;
		currentScaleName?: string | null;
		onHover: (scaleName: string | null) => void;
		onApply: (scaleName: string) => void;
	} = $props();

	let showAll = $state(false);
	let visibleGroups = $derived(showAll ? groups : groups.slice(0, 1));

	function groupTitle(missing: number): string {
		const total = selectedPcs.length;
		const hits = total - missing;
		return missing === 0 ? `Fits all ${total} notes` : `Fits ${hits} of ${total} notes`;
	}

	const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	function noteCells(m: ScaleMatch): { name: string; hit: boolean }[] {
		const pcs = m.scale.chroma.split('').map((c, i) => (c === '1' ? i : -1)).filter(i => i >= 0);
		const names = Pcset.notes(m.scale.chroma);
		return pcs.map((pc, i) => ({ name: names[i] ?? PC_NAMES[pc], hit: selectedPcs.includes(pc) }));
	}
</script>

<div class="space-y-3 text-sm">
	<p class="text-neutral-600">Selected: {selectedPcs.map(pc => PC_NAMES[pc]).join(' ')}</p>
	{#if groups.length > 1}
		<label class="flex items-center gap-2 cursor-pointer">
			<input type="checkbox" bind:checked={showAll} />
			<span>Show all Barry Harris scales</span>
		</label>
	{/if}
	{#each visibleGroups as group (group.missing)}
		<section>
			<h3 class="font-semibold mb-1">
				{groupTitle(group.missing)}
				<span class="text-neutral-400 font-normal">({group.matches.length})</span>
			</h3>
			<ul class="space-y-1">
				{#each group.matches as m (m.scale.name)}
					<li>
						<button
							class="w-full text-left border rounded p-2 hover:bg-neutral-100"
							class:ring-2={m.scale.name === currentScaleName}
							style="border-left: 6px solid {scaleColor(m.scale.name)}"
							onmouseenter={() => onHover(m.scale.name)}
							onmouseleave={() => onHover(null)}
							onclick={() => onApply(m.scale.name)}
						>
							<div class="flex items-baseline gap-2">
								<span class="font-medium">{shortName(m.scale)}</span>
								<span class="text-xs text-neutral-500">{m.scale.name}</span>
								{#if hasKey && m.keyOverlap !== null}
									<span class="ml-auto text-xs text-neutral-500">key {m.keyOverlap}/7</span>
								{/if}
							</div>
							<div class="flex flex-wrap gap-1 font-mono text-xs mt-1">
								{#each noteCells(m) as cell}
									<span class:font-bold={cell.hit} class:text-neutral-400={!cell.hit}>{cell.name}</span>
								{/each}
								{#if m.misses.length}
									<span class="text-red-600 ml-2">outside: {m.misses.map(pc => PC_NAMES[pc]).join(' ')}</span>
								{/if}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
