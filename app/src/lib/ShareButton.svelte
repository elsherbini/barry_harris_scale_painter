<script lang="ts">
	let { beforeCopy }: { beforeCopy?: () => Promise<void> | void } = $props();

	let copied = $state(false);
	let fallbackUrl = $state<string | null>(null);
	let fallbackInput = $state<HTMLInputElement | null>(null);

	async function copyLink() {
		await beforeCopy?.();
		const url = location.href;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			fallbackUrl = null;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// No clipboard access (e.g. a non-secure context): show the URL so it can be copied by hand.
			fallbackUrl = url;
			queueMicrotask(() => fallbackInput?.select());
		}
	}
</script>

<div class="flex items-center gap-2">
	<button class="px-3 py-1 border rounded" onclick={copyLink} aria-live="polite">{copied ? 'Copied' : 'Copy link'}</button>
	{#if fallbackUrl}
		<input class="w-64 px-2 py-1 border rounded font-mono text-xs" type="text" readonly value={fallbackUrl} bind:this={fallbackInput}
			aria-label="Share link" onfocus={(e) => e.currentTarget.select()} />
	{/if}
</div>
