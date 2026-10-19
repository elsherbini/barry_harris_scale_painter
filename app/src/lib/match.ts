import type { BarryHarrisScale, ScaleType } from './scales';
import { countKeyOverlap } from './filter';

export type ScaleMatch = {
	scale: BarryHarrisScale;
	hits: number[];      // selected pitch classes that are in the scale
	misses: number[];    // selected pitch classes that are not in the scale
	keyOverlap: number | null;
};

export type MatchGroup = { missing: number; matches: ScaleMatch[] };

const TYPE_ORDER: ScaleType[] = ['maj6', 'min6', 'dom7', 'dom7b5', 'octatonic'];
const ROOT_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function pitchClassesOf(midi: number[]): number[] {
	return [...new Set(midi.map(m => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
}

export function matchScales(
	pcs: number[],
	scales: BarryHarrisScale[],
	keyChroma: string | null
): MatchGroup[] {
	if (pcs.length === 0) return [];
	const buckets = new Map<number, ScaleMatch[]>();
	for (const scale of scales) {
		const hits = pcs.filter(pc => scale.chroma[pc] === '1');
		const misses = pcs.filter(pc => scale.chroma[pc] !== '1');
		const m: ScaleMatch = {
			scale,
			hits,
			misses,
			keyOverlap: keyChroma ? countKeyOverlap(keyChroma, scale.chroma) : null,
		};
		if (!buckets.has(misses.length)) buckets.set(misses.length, []);
		buckets.get(misses.length)!.push(m);
	}
	const compare = (a: ScaleMatch, b: ScaleMatch) =>
		((b.keyOverlap ?? 0) - (a.keyOverlap ?? 0)) ||
		(TYPE_ORDER.indexOf(a.scale.type) - TYPE_ORDER.indexOf(b.scale.type)) ||
		(ROOT_ORDER.indexOf(a.scale.root) - ROOT_ORDER.indexOf(b.scale.root));
	return [...buckets.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([missing, matches]) => ({ missing, matches: matches.sort(compare) }));
}
