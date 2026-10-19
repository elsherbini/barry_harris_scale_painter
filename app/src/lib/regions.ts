export type Span = { line: number; start: number; end: number }; // onsets in seconds, inclusive
export type Selection = Span;
export type Region = Span & { id: string; scaleName: string };

const EPS = 1e-6;

export function prevOnset(onsets: number[], t: number): number | null {
	let best: number | null = null;
	for (const o of onsets) if (o < t - EPS) best = o;
	return best;
}

export function nextOnset(onsets: number[], t: number): number | null {
	for (const o of onsets) if (o > t + EPS) return o;
	return null;
}

export function overlaps(a: Span, b: Span): boolean {
	return a.line === b.line && a.start <= b.end + EPS && b.start <= a.end + EPS;
}

export function sameSpan(a: Span | null, b: Span | null): boolean {
	if (!a || !b) return a === b;
	return a.line === b.line && Math.abs(a.start - b.start) < EPS && Math.abs(a.end - b.end) < EPS;
}

/**
 * Add `incoming` to `regions`. Existing regions on the same line that overlap it are
 * trimmed to the neighboring onsets, split in two, or dropped. `onsets` must be the
 * sorted distinct note onsets of `incoming.line`.
 */
export function applyRegion(regions: Region[], incoming: Region, onsets: number[]): Region[] {
	const out: Region[] = [];
	for (const r of regions) {
		if (!overlaps(r, incoming)) { out.push(r); continue; }
		if (r.start < incoming.start - EPS) {
			const end = prevOnset(onsets, incoming.start);
			if (end !== null && end >= r.start - EPS) out.push({ ...r, end });
		}
		if (r.end > incoming.end + EPS) {
			const start = nextOnset(onsets, incoming.end);
			if (start !== null && start <= r.end + EPS) {
				const alreadyKept = r.start < incoming.start - EPS;
				out.push({ ...r, start, id: alreadyKept ? r.id + ':2' : r.id });
			}
		}
	}
	out.push(incoming);
	return out;
}

let counter = 0;
export function newRegionId(): string {
	counter += 1;
	return 'r' + counter;
}
