<script lang="ts">
	import 'abcjs/abcjs-audio.css';

	type RenderRef = { tune: any; container: HTMLDivElement };

	let {
		primary,      // the view that drives audio
		secondary,    // optional second view to mirror the cursor on
	}: {
		primary: RenderRef | null;
		secondary: RenderRef | null;
	} = $props();

	let audioEl: HTMLDivElement;
	let ABCJS: any = $state(null);
	$effect(() => { import('abcjs').then(mod => { ABCJS = mod.default ?? mod; }); });

	function clearCursor(container: HTMLDivElement) {
		container.querySelectorAll('.abcjs-cursor').forEach(e => e.remove());
		container.querySelectorAll('.abcjs-highlight').forEach(e => e.classList.remove('abcjs-highlight'));
	}

	function showEvent(container: HTMLDivElement, ev: any) {
		if (!ev || (ev.measureStart && ev.left === null)) return;
		clearCursor(container);
		for (const group of ev.elements ?? []) for (const el of group) el.classList.add('abcjs-highlight');
		const svg = container.querySelector('svg');
		if (!svg || ev.left === null) return;
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('class', 'abcjs-cursor');
		line.setAttribute('x1', String(ev.left - 2)); line.setAttribute('x2', String(ev.left - 2));
		line.setAttribute('y1', String(ev.top));      line.setAttribute('y2', String(ev.top + ev.height));
		svg.appendChild(line);
	}

	$effect(() => {
		if (!ABCJS || !primary || !audioEl) return;
		if (!ABCJS.synth.supportsAudio()) { audioEl.textContent = 'Audio not supported in this browser.'; return; }
		const p = primary, s = secondary;
		let secondTimer: any = null;
		let synthControl: any = null;
		const cursorControl = {
			beatSubdivisions: 2,
			onReady(sc: any) {
				synthControl = sc;
				const pause = sc.pause.bind(sc), restart = sc.restart.bind(sc), seek = sc.seek.bind(sc);
				sc.pause = () => { pause(); secondTimer?.pause(); };
				sc.restart = () => { restart(); secondTimer?.setProgress(0); };
				sc.seek = (pct: number, units: string) => { seek(pct, units); secondTimer?.setProgress(pct, units); };
			},
			onStart() { secondTimer?.start(synthControl?.percent ?? 0); },
			onEvent(ev: any) { showEvent(p.container, ev); },
			onFinished() { clearCursor(p.container); if (s) clearCursor(s.container); secondTimer?.reset(); secondTimer?.stop(); },
		};
		audioEl.innerHTML = '';
		const synth = new ABCJS.synth.SynthController();
		synth.load(audioEl, cursorControl, { displayPlay: true, displayProgress: true, displayWarp: true, displayRestart: true });
		synth.setTune(p.tune, false).then(() => {
			if (s) secondTimer = new ABCJS.TimingCallbacks(s.tune, { beatSubdivisions: 2, eventCallback: (ev: any) => showEvent(s.container, ev) });
		}).catch((err: unknown) => console.warn('audio setup error', err));
		return () => {
			if (synth.isStarted) synth.pause();
			secondTimer?.stop();
			clearCursor(p.container);
			if (s) clearCursor(s.container);
		};
	});
</script>

<div bind:this={audioEl} class="min-w-[260px] flex-1"></div>
