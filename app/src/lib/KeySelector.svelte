<script lang="ts">
	import { MODE_OPTIONS, ROOT_OPTIONS, keyNotes, type KeyCenter } from '$lib/key';

	let {
		abcKey,
		override,
		onChange,
	}: {
		abcKey: KeyCenter | null;
		override: KeyCenter | 'none' | null;
		onChange: (next: KeyCenter | 'none' | null) => void;
	} = $props();

	let effective = $derived(override === 'none' ? null : (override ?? abcKey));
	let root = $derived(effective?.root ?? null);
	let mode = $derived(effective?.mode ?? 'major');

	function pickRoot(r: string) {
		onChange({ root: r, mode });
	}
	function pickMode(m: string) {
		if (!root) return;
		onChange({ root, mode: m });
	}
</script>

<section class="space-y-2 text-sm">
	<div class="flex items-baseline gap-2">
		<span class="font-semibold">Key</span>
		{#if effective}
			<span>{effective.root} {effective.mode}: {keyNotes(effective).join(' ')}</span>
		{:else}
			<span class="text-neutral-500">none</span>
		{/if}
		<button class="ml-auto underline disabled:opacity-40" onclick={() => onChange(null)} disabled={override === null}>from ABC</button>
		<button class="underline disabled:opacity-40" onclick={() => onChange('none')} disabled={override === 'none'}>none</button>
	</div>
	<div class="flex flex-wrap gap-1">
		{#each ROOT_OPTIONS as r}
			<button class="px-2 py-0.5 border rounded" class:bg-neutral-800={root === r} class:text-white={root === r} onclick={() => pickRoot(r)}>{r}</button>
		{/each}
	</div>
	<select class="border rounded px-2 py-1 w-full" value={mode} onchange={(e) => pickMode((e.target as HTMLSelectElement).value)} disabled={!root}>
		{#each MODE_OPTIONS as m}
			<option value={m}>{m}</option>
		{/each}
	</select>
</section>
