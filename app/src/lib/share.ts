import { DEFAULT_ABC } from './abc';
import type { ColorMode } from './StaffView.svelte';
import type { Accidentals } from './spelling';
import type { KeyCenter } from './key';
import type { Span } from './regions';

export type View = 'traditional' | 'diminished' | 'side-by-side';
export type SharedRegion = Span & { scaleName: string };
export type KeyOverride = KeyCenter | 'none' | null;

/** Everything a share link carries. Selection, preview and editor visibility are transient and left out. */
export type ShareState = {
	abc: string;
	regions: SharedRegion[];
	view: View;
	colors: ColorMode;
	acc: Accidentals;
	key: KeyOverride;
};

export const DEFAULT_SHARE_STATE: ShareState = {
	abc: DEFAULT_ABC,
	regions: [],
	view: 'traditional',
	colors: 'bw',
	acc: 'flat',
	key: null,
};

const VERSION = 1;
const VIEWS: View[] = ['traditional', 'diminished', 'side-by-side'];
const COLORS: ColorMode[] = ['metaharmony', 'bw', 'elements'];
const ACCS: Accidentals[] = ['flat', 'sharp'];

/** The wire format: regions as [line, start, end, scaleName] tuples. */
type Doc = {
	v: number;
	abc: string;
	regions: [number, number, number, string][];
	view: View;
	colors: ColorMode;
	acc: Accidentals;
	key: KeyOverride;
};

function isDefault(s: ShareState): boolean {
	const d = DEFAULT_SHARE_STATE;
	return s.abc === d.abc && s.regions.length === 0 && s.view === d.view && s.colors === d.colors && s.acc === d.acc && s.key === d.key;
}

/** Encode the state as a base64url deflate token; the default state becomes '' so the URL stays bare. */
export async function encodeState(s: ShareState): Promise<string> {
	if (isDefault(s)) return '';
	const doc: Doc = {
		v: VERSION,
		abc: s.abc,
		regions: s.regions.map(r => [r.line, r.start, r.end, r.scaleName]),
		view: s.view,
		colors: s.colors,
		acc: s.acc,
		key: s.key,
	};
	return encodeDocument(doc);
}

/** Decode a token from the fragment; null for anything malformed or from an unknown version. */
export async function decodeState(token: string): Promise<ShareState | null> {
	const doc = await decodeDocument(token);
	if (!doc || typeof doc !== 'object') return null;
	const d = doc as Partial<Doc>;
	if (d.v !== VERSION || typeof d.abc !== 'string' || !Array.isArray(d.regions)) return null;
	if (!VIEWS.includes(d.view as View) || !COLORS.includes(d.colors as ColorMode) || !ACCS.includes(d.acc as Accidentals)) return null;
	if (!isKeyOverride(d.key)) return null;
	const regions: SharedRegion[] = [];
	for (const t of d.regions) {
		if (!Array.isArray(t) || t.length !== 4) return null;
		const [line, start, end, scaleName] = t;
		if (typeof line !== 'number' || typeof start !== 'number' || typeof end !== 'number' || typeof scaleName !== 'string') return null;
		regions.push({ line, start, end, scaleName });
	}
	return { abc: d.abc, regions, view: d.view as View, colors: d.colors as ColorMode, acc: d.acc as Accidentals, key: d.key as KeyOverride };
}

function isKeyOverride(k: unknown): k is KeyOverride {
	if (k === null || k === 'none') return true;
	return typeof k === 'object' && k !== null && typeof (k as KeyCenter).root === 'string' && typeof (k as KeyCenter).mode === 'string';
}

// --- codec: JSON -> deflate-raw -> base64url -------------------------------------------

export async function encodeDocument(doc: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(doc)) as Uint8Array<ArrayBuffer>;
	const compressed = await pipe(bytes, new CompressionStream('deflate-raw'));
	return toBase64Url(compressed);
}

async function decodeDocument(token: string): Promise<unknown | null> {
	if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
	try {
		const bytes = await pipe(fromBase64Url(token), new DecompressionStream('deflate-raw'));
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		return null;
	}
}

async function pipe(input: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const source = new ReadableStream<BufferSource>({ start(c) { c.enqueue(input); c.close(); } });
	return new Uint8Array(await new Response(source.pipeThrough(stream)).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
	const bin = atob(b64);
	return Uint8Array.from(bin, c => c.charCodeAt(0));
}
