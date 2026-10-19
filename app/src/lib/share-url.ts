import { encodeState, type ShareState } from './share';

const PARAM = 's';

/** The share token from `#s=…`, or null when the fragment carries none. */
export function readFragment(): string | null {
	const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
	return new URLSearchParams(hash).get(PARAM);
}

export type FragmentWriter = {
	/** Schedule a write of `state`; rapid calls collapse into one write after the debounce window. */
	update(state: ShareState): void;
	/** Write any pending state now, and wait for any write already in flight. */
	flush(): Promise<void>;
};

/**
 * Mirrors the shareable state into the URL fragment with history.replaceState, debounced so
 * typing in the editor does not churn the address bar. An empty token clears the fragment.
 */
export function createFragmentWriter(debounceMs: number): FragmentWriter {
	let pending: ShareState | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inFlight: Promise<void> = Promise.resolve();

	function write(): Promise<void> {
		if (timer) { clearTimeout(timer); timer = null; }
		if (!pending) return inFlight;
		const state = pending;
		pending = null;
		inFlight = inFlight.then(async () => {
			const token = await encodeState(state);
			const url = location.pathname + location.search + (token ? `#${PARAM}=${token}` : '');
			history.replaceState(history.state, '', url);
		});
		return inFlight;
	}

	return {
		update(state) {
			pending = state;
			if (timer) clearTimeout(timer);
			timer = setTimeout(write, debounceMs);
		},
		flush: write,
	};
}
