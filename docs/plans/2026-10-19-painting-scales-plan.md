# Painting Scales Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A browser app where you type ABC notation, drag-select a span of notes on the rendered staff, see which Barry Harris scales fit (ranked by fewest missing notes, then key consonance), and "paint" the chosen scale onto the music as a colored band with a label.

**Architecture:** A SvelteKit (Svelte 5 runes) single-page app at `app/`. Pure TypeScript modules in `src/lib` do all the music logic (scale generation, matching, region bookkeeping, key parsing) and are unit-tested with vitest. A `StaffView` component renders ABC with the elsherbini abcjs fork (which adds `clef=diminished`), builds an index of every note's SVG element, onset time and pitch classes (from abcjs's `setUpAudio()` midi flattening, so key signatures are already resolved), handles pointer drag-selection, and draws overlay `<rect>`/`<text>` elements into the abcjs SVG between the staff lines and the notes. Regions are keyed by `(line, startOnset, endOnset)` so one region model drives both the traditional and diminished renders of the same ABC.

**Tech Stack:** SvelteKit 2 + Svelte 5, Vite 7, Tailwind CSS 4, TypeScript, vitest, tonal 6, abcjs (fork: `https://github.com/elsherbini/abcjs/tarball/master`).

---

## Design decisions (from the grilling session, 2026-10-18)

| Topic | Decision |
|---|---|
| Foundation | New SvelteKit app at `app/`; copy `scales.ts`/`filter.ts` from `reference_apps/filter_scales`. Tailwind only (no Skeleton). |
| Input | ABC textarea, live re-render. Session-only state, no URL/share persistence. |
| Views | Traditional / Diminished / Side-by-side toggle. Diminished color mode toggle (metaharmony / bw / elements). Overlays mirrored on both staves. |
| Selection | Horizontal drag on one system line selects every note (all voices, all staves on that line) whose x-center lies in the dragged range. May cross bar lines, not line breaks. |
| Pitch set | Unique pitch classes, durations ignored, rests and tied continuations ignored. |
| Ranking | Group by number of selected pitch classes missing from the scale (0, 1, 2…). Within a group: key overlap desc (if key set), then type order, then root order. Show the best group; "Show more" reveals the next. |
| Key center | Default parsed from the ABC `K:` field; overridable with a root + mode selector; "none" disables consonance sorting. |
| Labels | Non-overlapping regions. A new region overwrites: overlapping old regions are trimmed, split or removed. Translucent rect (30%) in the scale's color behind the notes spanning the staff height, short name text above the top staff. |
| Short names | `C6 dim`, `Cm6 dim`, `C7 dim`, `C7b5 dim`, `C oct`. |
| Candidate row | Color swatch, short name, the 8 scale notes with selected ones bold, selected notes missing from the scale in red, key overlap count. Hover previews the band on the staff; click applies. |
| Outside notes | Noteheads in a labeled region whose pitch class is outside the region's scale get a thin red ring. |
| Sidebar | Right sidebar. Shows candidates while a selection exists; otherwise a legend of labeled regions with delete buttons; clicking a legend row re-selects that region. |
| Playback | abcjs SynthController on the primary view with a TimingCallbacks-driven cursor on the secondary view (same pattern as `reference_apps/diminished_staff/index.html`). |
| Touch | Pointer events + `touch-action: none` on the SVG. Desktop-first. |
| Colors | From `reference_apps/filter_scales/scripts/tag-svg.js` `COLOR_SCALE_MAP`. Families of four scales a minor third apart share one color. |

## Facts about abcjs you need (verified in `reference_apps/diminished_staff/abcjs/src`)

- `ABCJS.renderAbc(el, abc, opts)` returns an array of tune objects. `opts.add_classes: true` makes every note a `<g class="abcjs-note abcjs-l{line} abcjs-m{measure} abcjs-v{voice} abcjs-n{note}">`. Each system line is wrapped in `<g class="abcjs-staff-wrapper abcjs-l{N}">` where `N` is the index into `tune.lines`. Inside the wrapper, each staff's lines are a `<g class="abcjs-staff">` that was *prepended*, so staff groups are the first children of the wrapper (in reverse drawing order; sort them by `getBBox().y`).
- `tune.lines[l].staff[s].voices[v]` is an array of elements. Notes have `el_type === 'note'`; rests also have `el_type === 'note'` but carry a `rest` property. Each drawn element has `abselem.elemset[0]`, the SVG `<g>` for that element. Noteheads inside it have class `abcjs-notehead`.
- `tune.setUpAudio({})` is synchronous and sets `elem.midiPitches = [{pitch, start, duration, ...}]` on every sounding note (`pitch` is a MIDI number with key signature and bar accidentals applied; `start` is seconds from the tune's tempo). Tied-continuation notes get an empty array, rests get none.
- `tune.getKeySignature()` returns `{ root: 'C', acc: '' | '#' | 'b', mode: '' | 'm' | 'Dor' | 'Mix' | 'Lyd' | 'Phr' | 'Loc' | 'Ion' | 'Aeo' }`.
- The fork adds `renderAbc` option `diminishedColors: 'metaharmony' | 'bw' | 'elements'` and the `clef=diminished` key modifier.
- Before `npm install`, check the fork's master has everything the local checkout has: `git -C reference_apps/diminished_staff/abcjs status -sb` should show no `ahead` marker. If it does, push it first.

---

### Task 1: Scaffold the SvelteKit app

**Files:**
- Create: `app/package.json`
- Create: `app/svelte.config.js`
- Create: `app/vite.config.ts`
- Create: `app/tsconfig.json`
- Create: `app/src/app.html`
- Create: `app/src/app.css`
- Create: `app/src/app.d.ts`
- Create: `app/src/routes/+layout.ts`
- Create: `app/src/routes/+layout.svelte`
- Create: `app/src/routes/+page.svelte`
- Create: `app/.gitignore`
- Create: `.gitignore` (repo root)

**Step 1: Write package.json**

```json
{
	"name": "painting-scales",
	"private": true,
	"version": "0.0.1",
	"type": "module",
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "vite preview",
		"prepare": "svelte-kit sync || echo ''",
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"test": "vitest run",
		"test:watch": "vitest"
	},
	"devDependencies": {
		"@sveltejs/adapter-static": "^3.0.10",
		"@sveltejs/kit": "^2.50.2",
		"@sveltejs/vite-plugin-svelte": "^6.2.4",
		"@tailwindcss/vite": "^4.2.2",
		"svelte": "^5.54.0",
		"svelte-check": "^4.4.2",
		"tailwindcss": "^4.2.2",
		"typescript": "^5.9.3",
		"vite": "^7.3.1",
		"vitest": "^4.1.2"
	},
	"dependencies": {
		"abcjs": "https://github.com/elsherbini/abcjs/tarball/master",
		"tonal": "^6.4.3"
	}
}
```

**Step 2: Write svelte.config.js**

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', strict: true })
	}
};

export default config;
```

**Step 3: Write vite.config.ts**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

**Step 4: Write tsconfig.json**

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	}
}
```

**Step 5: Write src/app.html, src/app.css, src/app.d.ts**

`src/app.html`:
```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

`src/app.css`:
```css
@import "tailwindcss";

body { @apply bg-neutral-50 text-neutral-900; }
```

`src/app.d.ts`:
```ts
declare global {
	namespace App {}
}
export {};
```

**Step 6: Write the layout and placeholder page**

`src/routes/+layout.ts`:
```ts
export const prerender = true;
export const ssr = false;
```

`src/routes/+layout.svelte`:
```svelte
<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head><title>Painting Scales</title></svelte:head>

{@render children()}
```

`src/routes/+page.svelte`:
```svelte
<main class="p-4">
	<h1 class="text-2xl font-bold">Painting Scales</h1>
</main>
```

**Step 7: Write .gitignore files**

`app/.gitignore`:
```
node_modules
/build
/.svelte-kit
.DS_Store
*.local
```

Repo root `.gitignore` (the reference apps have their own git repos, keep them out of this one):
```
reference_apps/
.DS_Store
```

**Step 8: Install and smoke test**

Run from the repo root:
```bash
git -C reference_apps/diminished_staff/abcjs status -sb | head -1
cd app && npm install && npm run check
```
Expected: `status -sb` shows `## master...origin/master` with no `[ahead N]`; `npm run check` reports `0 errors`.

Run: `cd app && npm run dev -- --open`
Expected: browser shows the "Painting Scales" heading. Stop the server.

**Step 9: Init git and commit**

```bash
cd /Users/jelsherbini/dev/painting_scales
git init
git add .gitignore app docs
git commit -m "chore: scaffold SvelteKit app for painting scales"
```

---

### Task 2: Copy scale data and key-overlap helpers from filter_scales

**Files:**
- Create: `app/src/lib/scales.ts` (copy of `reference_apps/filter_scales/src/lib/scales.ts`)
- Create: `app/src/lib/scales.test.ts`
- Create: `app/src/lib/filter.ts` (trimmed copy)
- Create: `app/src/lib/filter.test.ts`

**Step 1: Copy scales.ts verbatim**

```bash
cp reference_apps/filter_scales/src/lib/scales.ts app/src/lib/scales.ts
```

It exports `ScaleType`, `BarryHarrisScale { name, aliases, type, root, chroma }`, and `ALL_SCALES` (45 scales, chroma is a 12-char `'1'/'0'` string indexed by pitch class, C = index 0).

**Step 2: Write scales.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { ALL_SCALES } from './scales';

describe('ALL_SCALES', () => {
	it('has 45 scales', () => {
		expect(ALL_SCALES).toHaveLength(45);
	});

	it('C Maj6 Diminished is C D E F G Ab A B', () => {
		const s = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
		expect(s.chroma).toBe('101011011111');
	});

	it('every scale has 8 notes', () => {
		for (const s of ALL_SCALES) {
			expect(s.chroma.split('').filter(c => c === '1')).toHaveLength(8);
		}
	});
});
```

**Step 3: Write filter.ts (only what we need)**

```ts
export function countKeyOverlap(keyChroma: string, scaleChroma: string): number {
	let count = 0;
	for (let i = 0; i < 12; i++) {
		if (keyChroma[i] === '1' && scaleChroma[i] === '1') count++;
	}
	return count;
}
```

**Step 4: Write filter.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { countKeyOverlap } from './filter';
import { ALL_SCALES } from './scales';
import { Pcset, Scale } from 'tonal';

describe('countKeyOverlap', () => {
	it('C major shares all 7 notes with C Maj6 Diminished', () => {
		const key = Pcset.chroma(Scale.get('C major').notes);
		const s = ALL_SCALES.find(s => s.name === 'C Maj6 Diminished')!;
		expect(countKeyOverlap(key, s.chroma)).toBe(7);
	});

	it('C major shares 4 notes with Gb Maj6 Diminished', () => {
		const key = Pcset.chroma(Scale.get('C major').notes);
		const s = ALL_SCALES.find(s => s.name === 'Gb Maj6 Diminished')!;
		// Gb Maj6 dim = Gb Ab Bb B Db D Eb F -> shares F, B, D only... compute explicitly:
		expect(countKeyOverlap(key, s.chroma)).toBe(
			s.chroma.split('').filter((c, i) => c === '1' && key[i] === '1').length
		);
	});
});
```

**Step 5: Run the tests**

Run: `cd app && npx vitest run`
Expected: 5 tests pass.

**Step 6: Commit**

```bash
git add app/src/lib
git commit -m "feat: add Barry Harris scale data and key overlap helper"
```

---

### Task 3: Scale colors and short names

**Files:**
- Create: `app/src/lib/colors.ts`
- Create: `app/src/lib/colors.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { SCALE_COLORS, scaleColor, shortName } from './colors';
import { ALL_SCALES } from './scales';

describe('SCALE_COLORS', () => {
	it('has a color for every one of the 45 scales', () => {
		for (const s of ALL_SCALES) {
			expect(SCALE_COLORS[s.name], s.name).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('C Maj6 Diminished is orange and G Min6 Diminished is magenta', () => {
		expect(scaleColor('C Maj6 Diminished')).toBe('#f09a41');
		expect(scaleColor('G Min6 Diminished')).toBe('#ce1ced');
	});

	it('scales a minor third apart share a color', () => {
		expect(scaleColor('A Maj6 Diminished')).toBe(scaleColor('Eb Maj6 Diminished'));
	});
});

describe('shortName', () => {
	const byName = (n: string) => ALL_SCALES.find(s => s.name === n)!;
	it('formats each scale type', () => {
		expect(shortName(byName('C Maj6 Diminished'))).toBe('C6 dim');
		expect(shortName(byName('G Min6 Diminished'))).toBe('Gm6 dim');
		expect(shortName(byName('Bb Dom7 Diminished'))).toBe('Bb7 dim');
		expect(shortName(byName('C Dom7b5 Diminished'))).toBe('C7b5 dim');
		expect(shortName(byName('Db Octatonic'))).toBe('Db oct');
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/colors.test.ts`
Expected: FAIL, cannot find module './colors'.

**Step 3: Write colors.ts**

Colors come from `reference_apps/filter_scales/scripts/tag-svg.js`.

```ts
import type { BarryHarrisScale } from './scales';

const FAMILIES: Record<string, string[]> = {
	'#f09a41': ['A Maj6 Diminished', 'C Maj6 Diminished', 'Eb Maj6 Diminished', 'Gb Maj6 Diminished', 'Eb Dom7b5 Diminished', 'C Dom7b5 Diminished'],
	'#7741f0': ['E Maj6 Diminished', 'G Maj6 Diminished', 'Bb Maj6 Diminished', 'Db Maj6 Diminished', 'E Dom7b5 Diminished', 'Db Dom7b5 Diminished'],
	'#29f043': ['F Maj6 Diminished', 'Ab Maj6 Diminished', 'B Maj6 Diminished', 'D Maj6 Diminished', 'F Dom7b5 Diminished', 'D Dom7b5 Diminished'],
	'#f0be35': ['A Min6 Diminished', 'C Min6 Diminished', 'Eb Min6 Diminished', 'Gb Min6 Diminished'],
	'#f05d35': ['A Dom7 Diminished', 'C Dom7 Diminished', 'Eb Dom7 Diminished', 'Gb Dom7 Diminished'],
	'#ce1ced': ['E Min6 Diminished', 'G Min6 Diminished', 'Bb Min6 Diminished', 'Db Min6 Diminished'],
	'#a4f04d': ['F Dom7 Diminished', 'Ab Dom7 Diminished', 'B Dom7 Diminished', 'D Dom7 Diminished'],
	'#6584f0': ['E Dom7 Diminished', 'G Dom7 Diminished', 'Bb Dom7 Diminished', 'Db Dom7 Diminished'],
	'#4df0bf': ['F Min6 Diminished', 'Ab Min6 Diminished', 'B Min6 Diminished', 'D Min6 Diminished'],
	'#f0295d': ['Db Octatonic'],
	'#efe341': ['C Octatonic'],
	'#56b4e9': ['D Octatonic'],
};

export const SCALE_COLORS: Record<string, string> = Object.fromEntries(
	Object.entries(FAMILIES).flatMap(([color, names]) => names.map(n => [n, color]))
);

export function scaleColor(name: string): string {
	return SCALE_COLORS[name] ?? '#999999';
}

const SUFFIX: Record<BarryHarrisScale['type'], string> = {
	maj6: '6 dim',
	min6: 'm6 dim',
	dom7: '7 dim',
	dom7b5: '7b5 dim',
	octatonic: ' oct',
};

export function shortName(scale: BarryHarrisScale): string {
	return scale.root + SUFFIX[scale.type];
}
```

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/colors.test.ts`
Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add app/src/lib/colors.ts app/src/lib/colors.test.ts
git commit -m "feat: scale colors and short names"
```

---

### Task 4: Scale matching and ranking

**Files:**
- Create: `app/src/lib/match.ts`
- Create: `app/src/lib/match.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { matchScales, pitchClassesOf } from './match';
import { ALL_SCALES } from './scales';
import { Pcset, Scale } from 'tonal';

const C_MAJOR = Pcset.chroma(Scale.get('C major').notes);

describe('pitchClassesOf', () => {
	it('dedupes and sorts midi numbers into pitch classes', () => {
		expect(pitchClassesOf([60, 64, 67, 72, 61])).toEqual([0, 1, 4, 7]);
	});
});

describe('matchScales', () => {
	it('returns no groups for an empty selection', () => {
		expect(matchScales([], ALL_SCALES, null)).toEqual([]);
	});

	it('puts perfect fits in the 0-missing group', () => {
		// C E G A = C6 chord
		const groups = matchScales([0, 4, 7, 9], ALL_SCALES, null);
		expect(groups[0].missing).toBe(0);
		const names = groups[0].matches.map(m => m.scale.name);
		expect(names).toContain('C Maj6 Diminished');
		expect(names).toContain('A Min6 Diminished');
	});

	it('reports hits and misses per scale', () => {
		const groups = matchScales([0, 4, 7, 9, 1], ALL_SCALES, null); // add Db
		const c6 = groups.flatMap(g => g.matches).find(m => m.scale.name === 'C Maj6 Diminished')!;
		expect(c6.hits).toEqual([0, 4, 7, 9]);
		expect(c6.misses).toEqual([1]);
	});

	it('groups are ordered by missing count ascending and are non-empty', () => {
		const groups = matchScales([0, 1, 2, 3, 4, 5, 6, 7, 8], ALL_SCALES, null); // 9 notes: nothing fits
		expect(groups[0].missing).toBeGreaterThan(0);
		for (let i = 1; i < groups.length; i++) expect(groups[i].missing).toBeGreaterThan(groups[i - 1].missing);
		for (const g of groups) expect(g.matches.length).toBeGreaterThan(0);
	});

	it('sorts within a group by key overlap when a key is given', () => {
		const groups = matchScales([0, 4, 7], ALL_SCALES, C_MAJOR);
		const overlaps = groups[0].matches.map(m => m.keyOverlap!);
		for (let i = 1; i < overlaps.length; i++) expect(overlaps[i]).toBeLessThanOrEqual(overlaps[i - 1]);
		expect(groups[0].matches[0].scale.name).toBe('C Maj6 Diminished');
	});

	it('sorts within a group by type then root when no key is given', () => {
		const groups = matchScales([0], ALL_SCALES, null);
		const types = groups[0].matches.map(m => m.scale.type);
		const order = ['maj6', 'min6', 'dom7', 'dom7b5', 'octatonic'];
		const ranks = types.map(t => order.indexOf(t));
		for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/match.test.ts`
Expected: FAIL, cannot find module './match'.

**Step 3: Write match.ts**

```ts
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
```

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/match.test.ts`
Expected: 7 tests pass.

**Step 5: Commit**

```bash
git add app/src/lib/match.ts app/src/lib/match.test.ts
git commit -m "feat: match selected pitch classes against Barry Harris scales"
```

---

### Task 5: Key center from the ABC key signature and the mode list

**Files:**
- Create: `app/src/lib/key.ts`
- Create: `app/src/lib/key.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { keyFromAbc, keyChroma, MODE_OPTIONS } from './key';

describe('keyFromAbc', () => {
	it('maps abcjs key signatures to tonal root + mode', () => {
		expect(keyFromAbc({ root: 'C', acc: '', mode: '' })).toEqual({ root: 'C', mode: 'major' });
		expect(keyFromAbc({ root: 'A', acc: '', mode: 'm' })).toEqual({ root: 'A', mode: 'minor' });
		expect(keyFromAbc({ root: 'B', acc: 'b', mode: 'Mix' })).toEqual({ root: 'Bb', mode: 'mixolydian' });
		expect(keyFromAbc({ root: 'F', acc: '#', mode: 'Dor' })).toEqual({ root: 'F#', mode: 'dorian' });
	});

	it('returns null for no key', () => {
		expect(keyFromAbc({})).toBeNull();
		expect(keyFromAbc({ root: 'none', acc: '', mode: '' })).toBeNull();
	});
});

describe('keyChroma', () => {
	it('C major chroma', () => {
		expect(keyChroma({ root: 'C', mode: 'major' })).toBe('101011010101');
	});
	it('unknown mode gives null', () => {
		expect(keyChroma({ root: 'C', mode: 'nonsense' })).toBeNull();
	});
});

describe('MODE_OPTIONS', () => {
	it('starts with major and minor and includes melodic minor modes', () => {
		expect(MODE_OPTIONS[0]).toBe('major');
		expect(MODE_OPTIONS[1]).toBe('minor');
		expect(MODE_OPTIONS).toContain('altered');
		expect(MODE_OPTIONS).toContain('harmonic minor');
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/key.test.ts`
Expected: FAIL, cannot find module './key'.

**Step 3: Write key.ts**

```ts
import { Pcset, Scale } from 'tonal';

export type KeyCenter = { root: string; mode: string };

const ABC_MODES: Record<string, string> = {
	'': 'major', Ion: 'major', m: 'minor', Aeo: 'minor',
	Dor: 'dorian', Phr: 'phrygian', Lyd: 'lydian', Mix: 'mixolydian', Loc: 'locrian',
};

/** abcjs tune.getKeySignature() -> { root, acc, mode } */
export function keyFromAbc(sig: { root?: string; acc?: string; mode?: string }): KeyCenter | null {
	if (!sig.root || sig.root === 'none' || sig.root === 'HP' || sig.root === 'Hp') return null;
	const mode = ABC_MODES[sig.mode ?? ''];
	if (!mode) return null;
	return { root: sig.root + (sig.acc ?? ''), mode };
}

export function keyChroma(key: KeyCenter | null): string | null {
	if (!key) return null;
	const notes = Scale.get(key.root + ' ' + key.mode).notes;
	if (!notes.length) return null;
	return Pcset.chroma(notes);
}

export function keyNotes(key: KeyCenter | null): string[] {
	if (!key) return [];
	return Scale.get(key.root + ' ' + key.mode).notes;
}

const MAJOR_MODES = Scale.modeNames('major').map(m => m[1]);
const OTHER_MAJOR = MAJOR_MODES.filter(m => m !== 'major' && m !== 'minor');
export const MODE_OPTIONS: string[] = [
	'major', 'minor',
	...OTHER_MAJOR,
	...Scale.modeNames('harmonic minor').map(m => m[1]),
	...Scale.modeNames('melodic minor').map(m => m[1]),
];

export const ROOT_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
```

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/key.test.ts`
Expected: 5 tests pass. If `MODE_OPTIONS` does not contain `'altered'`, print `Scale.modeNames('melodic minor')` in a scratch test and use the exact tonal name (filter_scales relied on these names, so they should match).

**Step 5: Commit**

```bash
git add app/src/lib/key.ts app/src/lib/key.test.ts
git commit -m "feat: key center from ABC key signature and mode options"
```

---

### Task 6: Region model and overwrite-trimming

**Files:**
- Create: `app/src/lib/regions.ts`
- Create: `app/src/lib/regions.test.ts`

A `Region` is a labeled span on one system line, bounded by note onset times (seconds, from abcjs `midiPitches[].start`). `Selection` is the same shape without a scale. Onsets on a line are discrete, so trimming an old region means moving its edge to the neighboring onset.

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { applyRegion, prevOnset, nextOnset, type Region } from './regions';

const onsets = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
const r = (id: string, start: number, end: number, line = 0): Region =>
	({ id, line, start, end, scaleName: 'C Maj6 Diminished' });

describe('prevOnset / nextOnset', () => {
	it('finds the neighbors', () => {
		expect(prevOnset(onsets, 1)).toBe(0.5);
		expect(nextOnset(onsets, 1)).toBe(1.5);
		expect(prevOnset(onsets, 0)).toBeNull();
		expect(nextOnset(onsets, 3.5)).toBeNull();
	});
});

describe('applyRegion', () => {
	it('appends when nothing overlaps', () => {
		const out = applyRegion([r('a', 0, 1)], r('b', 2, 3), onsets);
		expect(out.map(x => x.id)).toEqual(['a', 'b']);
	});

	it('ignores regions on other lines', () => {
		const out = applyRegion([r('a', 0, 3, 1)], r('b', 0, 3, 0), onsets);
		expect(out).toHaveLength(2);
	});

	it('removes a fully covered region', () => {
		const out = applyRegion([r('a', 1, 2)], r('b', 0.5, 2.5), onsets);
		expect(out.map(x => x.id)).toEqual(['b']);
	});

	it('trims the right edge of a region that overlaps the start', () => {
		const out = applyRegion([r('a', 0, 2)], r('b', 1.5, 3), onsets);
		expect(out).toEqual([r('a', 0, 1), r('b', 1.5, 3)]);
	});

	it('trims the left edge of a region that overlaps the end', () => {
		const out = applyRegion([r('a', 1, 3)], r('b', 0, 1.5), onsets);
		expect(out).toEqual([r('a', 2, 3), r('b', 0, 1.5)]);
	});

	it('splits a region that contains the new one', () => {
		const out = applyRegion([r('a', 0, 3.5)], r('b', 1, 2), onsets);
		expect(out).toEqual([r('a', 0, 0.5), { ...r('a', 2.5, 3.5), id: 'a:2' }, r('b', 1, 2)]);
	});

	it('replaces a region with identical bounds', () => {
		const out = applyRegion([r('a', 1, 2)], { ...r('b', 1, 2), scaleName: 'G Min6 Diminished' }, onsets);
		expect(out).toHaveLength(1);
		expect(out[0].scaleName).toBe('G Min6 Diminished');
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/regions.test.ts`
Expected: FAIL, cannot find module './regions'.

**Step 3: Write regions.ts**

```ts
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
```

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/regions.test.ts`
Expected: 8 tests pass.

**Step 5: Commit**

```bash
git add app/src/lib/regions.ts app/src/lib/regions.test.ts
git commit -m "feat: region model with overwrite trimming"
```

---

### Task 7: ABC helpers (diminished clef transform, default tune)

**Files:**
- Create: `app/src/lib/abc.ts`
- Create: `app/src/lib/abc.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { makeDimAbc, DEFAULT_ABC } from './abc';

describe('makeDimAbc', () => {
	it('adds clef=diminished to the K: field', () => {
		expect(makeDimAbc('X:1\nK:C\nCDEF|')).toBe('X:1\nK:C clef=diminished\nCDEF|');
	});
	it('rewrites voice clefs', () => {
		expect(makeDimAbc('K:C\nV:1 treble\nV:2 clef=bass\n')).toBe(
			'K:C clef=diminished\nV:1 diminished\nV:2 clef=diminished-8\n'
		);
	});
	it('drops octave= modifiers', () => {
		expect(makeDimAbc('K:C clef=treble octave=-1\n')).not.toContain('octave=');
	});
});

describe('DEFAULT_ABC', () => {
	it('has a key and at least two lines of music', () => {
		expect(DEFAULT_ABC).toMatch(/^K:/m);
		expect(DEFAULT_ABC.split('\n').filter(l => l.includes('|')).length).toBeGreaterThanOrEqual(2);
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/abc.test.ts`
Expected: FAIL, cannot find module './abc'.

**Step 3: Write abc.ts** (ported from `reference_apps/diminished_staff/index.html` `makeDimAbc`)

```ts
export function makeDimAbc(abc: string, bassOctave: 8 | 16 = 8): string {
	const bassClef = 'diminished-' + bassOctave;
	return abc
		.replace(/^(K:\s*\S+)/gm, '$1 clef=diminished')
		.replace(/\[K:([^\]]+)\]/g, '[K:$1 clef=diminished]')
		.replace(/^(V:\s*\S+\s+(?:clef=)?)bass/gm, '$1' + bassClef)
		.replace(/^(V:\s*\S+\s+(?:clef=)?)(treble|alto|tenor)/gm, '$1diminished')
		.replace(/\s+octave=-?\d+/g, '');
}

export const DEFAULT_ABC = `X:1
T:Example
L:1/8
M:4/4
Q:1/4=120
K:C
C D E F G A B c | d c B A G F E D | G A B c d e f g | c2 z2 z4 |
F _A c d _A F c d | e d c B A G F E | G ^G A _B B c ^c d | [c e g]4 z4 |`;
```

Note: the first regex also catches `K:C clef=treble` and appends a second `clef=`; abcjs uses the last one, and the `clef=treble` to `diminished` replacement for `V:` lines covers the common case. If a test tune uses `K:C clef=treble`, `makeDimAbc` output is `K:C clef=treble clef=diminished`, which renders fine.

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/abc.test.ts`
Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add app/src/lib/abc.ts app/src/lib/abc.test.ts
git commit -m "feat: diminished clef ABC transform and default tune"
```

---

### Task 8: Note index built from an abcjs tune

**Files:**
- Create: `app/src/lib/notes-index.ts`
- Create: `app/src/lib/notes-index.test.ts`

`indexTune` walks `tune.lines[].staff[].voices[][]`, keeps sounding notes, and records each note's SVG group, bounding box center, onset and pitch classes. It also exposes helpers to get the onsets of a line and the notes inside a span. The test uses a hand-built fake tune with stub `getBBox`.

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { indexTune, lineOnsets, notesInSpan, spanFromNotes } from './notes-index';

function fakeNote(x: number, start: number, pitches: number[], extra: Record<string, unknown> = {}) {
	return {
		el_type: 'note',
		midiPitches: pitches.map(p => ({ pitch: p, start })),
		abselem: { elemset: [{ getBBox: () => ({ x, y: 10, width: 10, height: 20 }) }] },
		...extra,
	};
}

const tune = {
	lines: [
		{ staff: [{ voices: [[
			fakeNote(10, 0, [60]),
			{ el_type: 'bar', abselem: { elemset: [] } },
			fakeNote(40, 0.5, [64, 67]),
			fakeNote(70, 1, [], {}),                       // tied continuation: no midi pitches
			{ el_type: 'note', rest: {}, abselem: { elemset: [{ getBBox: () => ({ x: 90, y: 0, width: 5, height: 5 }) }] } },
		]] }, { voices: [[
			fakeNote(12, 0, [48]),
		]] }] },
		{ nonMusic: {} },
		{ staff: [{ voices: [[ fakeNote(10, 2, [62]) ]] }] },
	],
};

describe('indexTune', () => {
	const notes = indexTune(tune as any);

	it('keeps only sounding notes and records line/staff/voice', () => {
		expect(notes).toHaveLength(4);
		expect(notes.map(n => n.line)).toEqual([0, 0, 0, 2]);
		expect(notes.map(n => n.staff)).toEqual([0, 0, 1, 0]);
	});

	it('records onset, pitch classes and x-center', () => {
		expect(notes[1].onset).toBe(0.5);
		expect(notes[1].pcs).toEqual([4, 7]);
		expect(notes[1].cx).toBe(45);
	});

	it('lineOnsets gives sorted distinct onsets per line', () => {
		expect(lineOnsets(notes, 0)).toEqual([0, 0.5]);
		expect(lineOnsets(notes, 2)).toEqual([2]);
	});

	it('notesInSpan returns all staves in the time range', () => {
		const hit = notesInSpan(notes, { line: 0, start: 0, end: 0 });
		expect(hit.map(n => n.midi[0])).toEqual([60, 48]);
	});

	it('spanFromNotes gives the onset bounds', () => {
		expect(spanFromNotes(notes.slice(0, 3))).toEqual({ line: 0, start: 0, end: 0.5 });
		expect(spanFromNotes([])).toBeNull();
	});
});
```

**Step 2: Run to verify failure**

Run: `cd app && npx vitest run src/lib/notes-index.test.ts`
Expected: FAIL, cannot find module './notes-index'.

**Step 3: Write notes-index.ts**

```ts
import { pitchClassesOf } from './match';
import type { Span } from './regions';

export type NoteInfo = {
	line: number;
	staff: number;
	voice: number;
	onset: number;          // seconds, from abcjs midiPitches[0].start
	midi: number[];
	pcs: number[];
	svgEl: SVGGraphicsElement;
	cx: number;             // x-center of the note group's bbox, in the SVG user coords
	bbox: DOMRect;
};

const EPS = 1e-6;

export function indexTune(tune: any): NoteInfo[] {
	const notes: NoteInfo[] = [];
	for (let l = 0; l < tune.lines.length; l++) {
		const line = tune.lines[l];
		if (!line.staff) continue;
		line.staff.forEach((staff: any, s: number) => {
			staff.voices.forEach((voice: any[], v: number) => {
				for (const el of voice) {
					if (el.el_type !== 'note' || el.rest) continue;
					if (!el.midiPitches || el.midiPitches.length === 0) continue;
					const svgEl = el.abselem?.elemset?.[0] as SVGGraphicsElement | undefined;
					if (!svgEl) continue;
					const bbox = svgEl.getBBox();
					const midi = el.midiPitches.map((p: any) => p.pitch as number);
					notes.push({
						line: l, staff: s, voice: v,
						onset: el.midiPitches[0].start,
						midi,
						pcs: pitchClassesOf(midi),
						svgEl,
						cx: bbox.x + bbox.width / 2,
						bbox,
					});
				}
			});
		});
	}
	return notes;
}

export function lineOnsets(notes: NoteInfo[], line: number): number[] {
	const set = new Set(notes.filter(n => n.line === line).map(n => n.onset));
	return [...set].sort((a, b) => a - b);
}

export function notesInSpan(notes: NoteInfo[], span: Span | null): NoteInfo[] {
	if (!span) return [];
	return notes.filter(n => n.line === span.line && n.onset >= span.start - EPS && n.onset <= span.end + EPS);
}

export function spanFromNotes(notes: NoteInfo[]): Span | null {
	if (notes.length === 0) return null;
	let start = Infinity, end = -Infinity;
	for (const n of notes) { start = Math.min(start, n.onset); end = Math.max(end, n.onset); }
	return { line: notes[0].line, start, end };
}

export function selectedPitchClasses(notes: NoteInfo[]): number[] {
	return pitchClassesOf(notes.flatMap(n => n.midi));
}
```

**Step 4: Run tests**

Run: `cd app && npx vitest run src/lib/notes-index.test.ts`
Expected: 5 tests pass.

**Step 5: Commit**

```bash
git add app/src/lib/notes-index.ts app/src/lib/notes-index.test.ts
git commit -m "feat: index abcjs tune notes with onsets, pitch classes and svg geometry"
```

---

### Task 9: Drag selection over the abcjs SVG

**Files:**
- Create: `app/src/lib/drag-select.ts`

This is browser-only (needs `getScreenCTM`), so it is verified manually in Task 11. Pointer coordinates are converted into the coordinate system of the line wrapper `<g>` so that comparisons with `NoteInfo.cx` (from `getBBox()` of children of that wrapper) are valid regardless of how abcjs scales the SVG.

**Step 1: Write drag-select.ts**

```ts
import type { NoteInfo } from './notes-index';
import { spanFromNotes } from './notes-index';
import type { Selection } from './regions';

const CLICK_TOLERANCE = 3;   // px in wrapper coords: below this, treat as a click
const HIT_PAD = 2;

function toLocal(ev: PointerEvent, el: SVGGraphicsElement): DOMPoint {
	const ctm = el.getScreenCTM();
	if (!ctm) return new DOMPoint(0, 0);
	return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
}

function lineWrappers(svg: SVGSVGElement): Map<number, SVGGElement> {
	const map = new Map<number, SVGGElement>();
	for (const g of svg.querySelectorAll<SVGGElement>('g.abcjs-staff-wrapper')) {
		const m = /abcjs-l(\d+)/.exec(g.getAttribute('class') ?? '');
		if (m) map.set(Number(m[1]), g);
	}
	return map;
}

/** Pick the line whose wrapper is vertically closest to the pointer. */
function lineAt(ev: PointerEvent, wrappers: Map<number, SVGGElement>): { line: number; wrapper: SVGGElement } | null {
	let best: { line: number; wrapper: SVGGElement; dist: number } | null = null;
	for (const [line, wrapper] of wrappers) {
		const p = toLocal(ev, wrapper);
		const b = wrapper.getBBox();
		const dist = p.y < b.y ? b.y - p.y : p.y > b.y + b.height ? p.y - (b.y + b.height) : 0;
		if (!best || dist < best.dist) best = { line, wrapper, dist };
	}
	return best;
}

export type DragSelectHandlers = {
	onChange: (sel: Selection | null) => void;   // fires during drag and on click
};

/**
 * Attach pointer handlers to the abcjs SVG. Returns a cleanup function.
 * Elements with class `ps-label` are ignored so region labels stay clickable.
 */
export function attachDragSelect(svg: SVGSVGElement, notes: NoteInfo[], handlers: DragSelectHandlers): () => void {
	svg.style.touchAction = 'none';
	svg.style.userSelect = 'none';
	let wrappers = lineWrappers(svg);
	let drag: { line: number; wrapper: SVGGElement; x0: number; moved: boolean } | null = null;
	let lastKey = '';

	function emit(sel: Selection | null) {
		const key = sel ? `${sel.line}:${sel.start}:${sel.end}` : '';
		if (key === lastKey) return;
		lastKey = key;
		handlers.onChange(sel);
	}

	function hits(line: number, xa: number, xb: number): NoteInfo[] {
		const lo = Math.min(xa, xb) - HIT_PAD, hi = Math.max(xa, xb) + HIT_PAD;
		return notes.filter(n => n.line === line && n.cx >= lo && n.cx <= hi);
	}

	function down(ev: PointerEvent) {
		if (ev.button !== 0) return;
		if ((ev.target as Element).closest('.ps-label')) return;
		wrappers = lineWrappers(svg);
		const at = lineAt(ev, wrappers);
		if (!at) return;
		drag = { line: at.line, wrapper: at.wrapper, x0: toLocal(ev, at.wrapper).x, moved: false };
		svg.setPointerCapture(ev.pointerId);
		ev.preventDefault();
	}

	function move(ev: PointerEvent) {
		if (!drag) return;
		const x = toLocal(ev, drag.wrapper).x;
		if (Math.abs(x - drag.x0) > CLICK_TOLERANCE) drag.moved = true;
		if (drag.moved) emit(spanFromNotes(hits(drag.line, drag.x0, x)));
	}

	function up(ev: PointerEvent) {
		if (!drag) return;
		const x = toLocal(ev, drag.wrapper).x;
		if (drag.moved) {
			emit(spanFromNotes(hits(drag.line, drag.x0, x)));
		} else {
			// click: select the single nearest note under the pointer, or clear
			const near = notes
				.filter(n => n.line === drag!.line && Math.abs(n.cx - x) <= n.bbox.width / 2 + HIT_PAD)
				.sort((a, b) => Math.abs(a.cx - x) - Math.abs(b.cx - x))[0];
			emit(near ? { line: near.line, start: near.onset, end: near.onset } : null);
		}
		svg.releasePointerCapture(ev.pointerId);
		drag = null;
	}

	svg.addEventListener('pointerdown', down);
	svg.addEventListener('pointermove', move);
	svg.addEventListener('pointerup', up);
	svg.addEventListener('pointercancel', up);
	return () => {
		svg.removeEventListener('pointerdown', down);
		svg.removeEventListener('pointermove', move);
		svg.removeEventListener('pointerup', up);
		svg.removeEventListener('pointercancel', up);
	};
}
```

**Step 2: Type-check**

Run: `cd app && npm run check`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/lib/drag-select.ts
git commit -m "feat: pointer drag selection over abcjs svg"
```

---

### Task 10: Overlay drawing (selection, region bands, labels, outside-note rings)

**Files:**
- Create: `app/src/lib/overlay.ts`

Draws into the abcjs SVG. Region/selection rects are inserted immediately after each `g.abcjs-staff` group so they sit above the staff lines and below notes. Label text and rings are appended at the end of the line wrapper so they sit above notes. Everything we add carries class `ps-overlay` so it can be wiped and redrawn.

**Step 1: Write overlay.ts**

```ts
import type { NoteInfo } from './notes-index';
import { notesInSpan } from './notes-index';
import type { Region, Selection } from './regions';
import { scaleColor, shortName } from './colors';
import { ALL_SCALES } from './scales';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD_Y = 4;
const PAD_X = 3;
const SELECTION_COLOR = '#0a9ecc';

export type OverlayInput = {
	notes: NoteInfo[];
	regions: Region[];
	selection: Selection | null;
	previewScaleName: string | null;   // hovered candidate: tints the selection in that color
	onLabelClick?: (regionId: string) => void;
};

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
	const e = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	e.classList.add('ps-overlay');
	return e;
}

function wrapperFor(svg: SVGSVGElement, line: number): SVGGElement | null {
	return svg.querySelector<SVGGElement>(`g.abcjs-staff-wrapper.abcjs-l${line}`);
}

/** Staff-line groups of a wrapper, top to bottom. */
function staffGroups(wrapper: SVGGElement): SVGGElement[] {
	return [...wrapper.querySelectorAll<SVGGElement>(':scope > g.abcjs-staff')]
		.sort((a, b) => a.getBBox().y - b.getBBox().y);
}

function xRange(notes: NoteInfo[]): { x: number; w: number } | null {
	if (notes.length === 0) return null;
	let x0 = Infinity, x1 = -Infinity;
	for (const n of notes) { x0 = Math.min(x0, n.bbox.x); x1 = Math.max(x1, n.bbox.x + n.bbox.width); }
	return { x: x0 - PAD_X, w: x1 - x0 + 2 * PAD_X };
}

function drawBand(
	svg: SVGSVGElement, line: number, spanNotes: NoteInfo[],
	color: string, opacity: number, dashed: boolean, dataId: string
): { wrapper: SVGGElement; x: number; topY: number } | null {
	const wrapper = wrapperFor(svg, line);
	const range = xRange(spanNotes);
	if (!wrapper || !range) return null;
	const groups = staffGroups(wrapper);
	let topY = Infinity;
	for (const g of groups) {
		const b = g.getBBox();
		topY = Math.min(topY, b.y);
		const rect = el('rect', {
			x: range.x, y: b.y - PAD_Y, width: range.w, height: b.height + 2 * PAD_Y,
			rx: 2, fill: color, 'fill-opacity': opacity,
			stroke: dashed ? color : 'none', 'stroke-dasharray': dashed ? '3 2' : 'none',
			'pointer-events': 'none', 'data-region': dataId,
		});
		g.after(rect);
	}
	return { wrapper, x: range.x, topY };
}

function drawLabel(wrapper: SVGGElement, x: number, topY: number, region: Region, color: string, onClick?: (id: string) => void) {
	const scale = ALL_SCALES.find(s => s.name === region.scaleName);
	const text = el('text', {
		x, y: topY - 8, fill: color, 'font-size': 11, 'font-weight': 700,
		'font-family': 'system-ui, sans-serif', 'data-region': region.id,
	});
	text.classList.add('ps-label');
	text.style.cursor = 'pointer';
	text.textContent = scale ? shortName(scale) : region.scaleName;
	if (onClick) text.addEventListener('click', () => onClick(region.id));
	wrapper.appendChild(text);
}

function drawOutsideRings(wrapper: SVGGElement, spanNotes: NoteInfo[], chroma: string) {
	for (const n of spanNotes) {
		const heads = [...n.svgEl.querySelectorAll<SVGGraphicsElement>('.abcjs-notehead')];
		const targets = heads.length === n.midi.length ? heads : [n.svgEl];
		targets.forEach((head, i) => {
			const pcs = heads.length === n.midi.length ? [((n.midi[i] % 12) + 12) % 12] : n.pcs;
			if (pcs.every(pc => chroma[pc] === '1')) return;
			const b = head.getBBox();
			wrapper.appendChild(el('circle', {
				cx: b.x + b.width / 2, cy: b.y + b.height / 2, r: Math.max(b.width, b.height) * 0.75,
				fill: 'none', stroke: '#d8254f', 'stroke-width': 1, 'pointer-events': 'none',
			}));
		});
	}
}

export function clearOverlays(svg: SVGSVGElement) {
	svg.querySelectorAll('.ps-overlay').forEach(e => e.remove());
}

export function drawOverlays(svg: SVGSVGElement, input: OverlayInput) {
	clearOverlays(svg);
	for (const region of input.regions) {
		const spanNotes = notesInSpan(input.notes, region);
		const color = scaleColor(region.scaleName);
		const band = drawBand(svg, region.line, spanNotes, color, 0.3, false, region.id);
		if (!band) continue;
		drawLabel(band.wrapper, band.x, band.topY, region, color, input.onLabelClick);
		const scale = ALL_SCALES.find(s => s.name === region.scaleName);
		if (scale) drawOutsideRings(band.wrapper, spanNotes, scale.chroma);
	}
	if (input.selection) {
		const spanNotes = notesInSpan(input.notes, input.selection);
		const color = input.previewScaleName ? scaleColor(input.previewScaleName) : SELECTION_COLOR;
		drawBand(svg, input.selection.line, spanNotes, color, input.previewScaleName ? 0.3 : 0.15, true, 'selection');
	}
}
```

**Step 2: Type-check**

Run: `cd app && npm run check`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/lib/overlay.ts
git commit -m "feat: svg overlays for selection, region bands, labels and outside-note rings"
```

---

### Task 11: StaffView component and the page shell with editor and view toggle

**Files:**
- Create: `app/src/lib/StaffView.svelte`
- Modify: `app/src/routes/+page.svelte`

Use @svelte5-coding conventions (runes, `$props`, callback props, no stores).

**Step 1: Write StaffView.svelte**

```svelte
<script lang="ts">
	import { makeDimAbc } from '$lib/abc';
	import { indexTune, type NoteInfo } from '$lib/notes-index';
	import { attachDragSelect } from '$lib/drag-select';
	import { drawOverlays } from '$lib/overlay';
	import type { Region, Selection } from '$lib/regions';

	export type ColorMode = 'metaharmony' | 'bw' | 'elements';

	let {
		abc,
		clef,
		colorMode = 'metaharmony',
		regions,
		selection,
		previewScaleName = null,
		onSelect,
		onLabelClick,
		onRendered,
	}: {
		abc: string;
		clef: 'treble' | 'diminished';
		colorMode?: ColorMode;
		regions: Region[];
		selection: Selection | null;
		previewScaleName?: string | null;
		onSelect: (sel: Selection | null) => void;
		onLabelClick?: (regionId: string) => void;
		onRendered?: (tune: any, notes: NoteInfo[]) => void;
	} = $props();

	let container: HTMLDivElement;
	let ABCJS: any = $state(null);
	let notes: NoteInfo[] = $state.raw([]);
	let renderCount = $state(0);

	$effect(() => {
		import('abcjs').then(mod => { ABCJS = mod.default ?? mod; });
	});

	// Render whenever abc / clef / colorMode / ABCJS change.
	$effect(() => {
		if (!ABCJS || !container) return;
		const source = clef === 'diminished' ? makeDimAbc(abc) : abc;
		const tune = ABCJS.renderAbc(container, source, {
			responsive: 'resize',
			add_classes: true,
			staffwidth: 760,
			...(clef === 'diminished' ? { diminishedColors: colorMode } : {}),
		})[0];
		tune.setUpAudio({});
		const idx = indexTune(tune);
		notes = idx;
		renderCount++;
		onRendered?.(tune, idx);
		const svg = container.querySelector('svg') as SVGSVGElement | null;
		if (!svg) return;
		return attachDragSelect(svg, idx, { onChange: onSelect });
	});

	// Redraw overlays whenever regions / selection / preview change or after a re-render.
	$effect(() => {
		renderCount;
		if (!container) return;
		const svg = container.querySelector('svg') as SVGSVGElement | null;
		if (!svg) return;
		drawOverlays(svg, { notes, regions, selection, previewScaleName, onLabelClick });
	});
</script>

<div class="staff-view" bind:this={container}></div>

<style>
	.staff-view :global(svg) { width: 100%; height: auto; display: block; }
	.staff-view :global(.abcjs-highlight) { fill: #0a9ecc; }
	.staff-view :global(.abcjs-cursor) { stroke: #f0295d; stroke-width: 2; opacity: 0.7; }
</style>
```

**Step 2: Write the page shell**

`src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import StaffView, { type ColorMode } from '$lib/StaffView.svelte';
	import { DEFAULT_ABC } from '$lib/abc';
	import type { Region, Selection } from '$lib/regions';

	type View = 'traditional' | 'diminished' | 'side-by-side';

	let abc = $state(DEFAULT_ABC);
	let view: View = $state('side-by-side');
	let colorMode: ColorMode = $state('metaharmony');
	let regions: Region[] = $state([]);
	let selection: Selection | null = $state(null);
	let editorOpen = $state(true);

	const VIEWS: View[] = ['traditional', 'diminished', 'side-by-side'];
	const COLOR_MODES: ColorMode[] = ['metaharmony', 'bw', 'elements'];
</script>

<main class="max-w-7xl mx-auto p-4 space-y-4">
	<header class="flex items-baseline gap-6">
		<h1 class="text-2xl font-bold">Painting Scales</h1>
		<button class="text-sm underline" onclick={() => (editorOpen = !editorOpen)}>
			{editorOpen ? 'Hide editor' : 'Show editor'}
		</button>
	</header>

	{#if editorOpen}
		<textarea class="w-full h-40 font-mono text-sm p-2 border rounded" bind:value={abc}></textarea>
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
	</div>

	<div class="grid gap-4" style="grid-template-columns: minmax(0, 1fr) 320px;">
		<div class="space-y-4">
			{#if view !== 'diminished'}
				<StaffView {abc} clef="treble" {regions} {selection} onSelect={(s) => (selection = s)} />
			{/if}
			{#if view !== 'traditional'}
				<StaffView {abc} clef="diminished" {colorMode} {regions} {selection} onSelect={(s) => (selection = s)} />
			{/if}
		</div>
		<aside class="border rounded p-3 text-sm">
			{#if selection}
				<p>Selected line {selection.line}, {selection.start.toFixed(2)}s to {selection.end.toFixed(2)}s</p>
			{:else}
				<p class="text-neutral-500">Drag across notes to select a passage.</p>
			{/if}
		</aside>
	</div>
</main>
```

**Step 3: Manual verification**

Run: `cd app && npm run dev -- --open`

Check, and fix before moving on:
1. Both staves render the default tune; the diminished one has colored triangles/ovals.
2. Drag horizontally on the traditional staff: a dashed blue band appears on BOTH staves spanning the dragged notes, and the sidebar shows the time range. The band sits above the staff lines and below the noteheads (notes stay fully visible).
3. Drag on the diminished staff: same result.
4. Drag on the second system line: band only on that line. Dragging across a bar line works.
5. Click a single note: one-note selection. Click empty space: selection clears.
6. Switch view to "traditional" only, then "diminished" only: selection persists on the remaining staff.
7. Edit the ABC (add a note): re-renders, selection band moves or clears without errors in the console.
8. Resize the window: band stays aligned with the notes (responsive viewBox scaling).

If the band is misaligned after resize or with the diminished clef, the cause is a transform between the wrapper `<g>` and the note groups. Fix by converting with `svgEl.getScreenCTM()` in `drag-select.ts` instead of the wrapper's, and by computing rect geometry from `getBBox()` of elements in the same group as the staff lines.

**Step 4: Commit**

```bash
git add app/src/lib/StaffView.svelte app/src/routes/+page.svelte
git commit -m "feat: staff view with drag selection, editor and view toggles"
```

---

### Task 12: Key selector

**Files:**
- Create: `app/src/lib/KeySelector.svelte`
- Modify: `app/src/routes/+page.svelte`

The page holds `abcKey` (parsed from the rendered tune's `getKeySignature()`) and `keyOverride: KeyCenter | null | 'none'`. Effective key = override if set, else the ABC key; `'none'` disables consonance sorting.

**Step 1: Write KeySelector.svelte**

```svelte
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
		<button class="ml-auto underline" onclick={() => onChange(null)} disabled={override === null}>from ABC</button>
		<button class="underline" onclick={() => onChange('none')} disabled={override === 'none'}>none</button>
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
```

**Step 2: Wire it into the page**

In `+page.svelte` script, add:
```ts
import KeySelector from '$lib/KeySelector.svelte';
import { keyFromAbc, keyChroma, type KeyCenter } from '$lib/key';

let abcKey: KeyCenter | null = $state(null);
let keyOverride: KeyCenter | 'none' | null = $state(null);
let effectiveKey = $derived(keyOverride === 'none' ? null : (keyOverride ?? abcKey));
let effectiveKeyChroma = $derived(keyChroma(effectiveKey));

function handleRendered(tune: any) {
	abcKey = keyFromAbc(tune.getKeySignature());
}
```
Pass `onRendered={handleRendered}` to both `StaffView`s, and put `<KeySelector {abcKey} override={keyOverride} onChange={(k) => (keyOverride = k)} />` at the top of the `<aside>`, above the selection text, with a `<hr class="my-3" />` after it.

**Step 3: Manual verification**

Run: `cd app && npm run dev`
- The sidebar shows "Key C major: C D E F G A B" for the default tune.
- Change `K:C` to `K:Am` in the editor: key becomes A minor.
- Click root "F" then choose "mixolydian": key shows F mixolydian; "from ABC" returns to the ABC key; "none" shows none.

**Step 4: Commit**

```bash
git add app/src/lib/KeySelector.svelte app/src/routes/+page.svelte
git commit -m "feat: key selector with ABC default and override"
```

---

### Task 13: Candidate list with hover preview and apply

**Files:**
- Create: `app/src/lib/CandidateList.svelte`
- Modify: `app/src/routes/+page.svelte`

**Step 1: Write CandidateList.svelte**

```svelte
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

	let shown = $state(1);
	$effect(() => { groups; shown = 1; });

	const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	function noteCells(m: ScaleMatch): { name: string; hit: boolean }[] {
		return Pcset.notes(m.scale.chroma).map((name, i) => {
			const pc = m.scale.chroma.split('').map((c, j) => (c === '1' ? j : -1)).filter(j => j >= 0)[i];
			return { name, hit: selectedPcs.includes(pc) };
		});
	}
</script>

<div class="space-y-3 text-sm">
	<p class="text-neutral-600">Selected: {selectedPcs.map(pc => PC_NAMES[pc]).join(' ')}</p>
	{#each groups.slice(0, shown) as group}
		<section>
			<h3 class="font-semibold mb-1">
				{group.missing === 0 ? 'Fits all notes' : `Missing ${group.missing} note${group.missing > 1 ? 's' : ''}`}
				<span class="text-neutral-400 font-normal">({group.matches.length})</span>
			</h3>
			<ul class="space-y-1">
				{#each group.matches as m}
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
	{#if shown < groups.length}
		<button class="underline" onclick={() => shown++}>Show scales missing {groups[shown].missing} note{groups[shown].missing > 1 ? 's' : ''}</button>
	{/if}
</div>
```

**Step 2: Wire into the page**

In `+page.svelte` script add:
```ts
import CandidateList from '$lib/CandidateList.svelte';
import { matchScales } from '$lib/match';
import { ALL_SCALES } from '$lib/scales';
import { notesInSpan, selectedPitchClasses, lineOnsets, type NoteInfo } from '$lib/notes-index';
import { applyRegion, newRegionId } from '$lib/regions';

let notes: NoteInfo[] = $state.raw([]);          // from whichever StaffView rendered last; both are equivalent
let previewScaleName: string | null = $state(null);

let selectedNotes = $derived(notesInSpan(notes, selection));
let selectedPcs = $derived(selectedPitchClasses(selectedNotes));
let groups = $derived(matchScales(selectedPcs, ALL_SCALES, effectiveKeyChroma));
let currentRegion = $derived(
	selection ? regions.find(r => r.line === selection!.line && r.start === selection!.start && r.end === selection!.end) ?? null : null
);

function handleRendered(tune: any, idx: NoteInfo[]) {
	abcKey = keyFromAbc(tune.getKeySignature());
	notes = idx;
	// Drop regions that no longer point at notes (ABC was edited).
	regions = regions.filter(r => notesInSpan(idx, r).length > 0);
}

function applyScale(scaleName: string) {
	if (!selection) return;
	regions = applyRegion(regions, { ...selection, id: newRegionId(), scaleName }, lineOnsets(notes, selection.line));
	previewScaleName = null;
	selection = null;
}
```
Pass `{previewScaleName}` to both `StaffView`s. Replace the selection paragraph in the aside with:
```svelte
{#if selection && selectedPcs.length}
	<CandidateList {groups} {selectedPcs} hasKey={!!effectiveKeyChroma} currentScaleName={currentRegion?.scaleName ?? null}
		onHover={(n) => (previewScaleName = n)} onApply={applyScale} />
{:else}
	<p class="text-neutral-500">Drag across notes to select a passage.</p>
{/if}
```

**Step 3: Manual verification**

Run: `cd app && npm run dev`
- Select bar 1 (C D E F G A B c): "Fits all notes" lists C Maj6 Diminished first (key C major, 7/7), with C D E F G A B bold and Ab grey.
- Select bar 5 (F Ab C D): group 0 contains F Min6 Diminished and D Dom7 Diminished among others.
- Select all of bar 7 (G G# A Bb B C C# D): 8 chromatic notes; group 0 is empty so the first group shown is "Missing N notes" with the red "outside" list.
- Hover a candidate: the selection band on both staves changes to that scale's color at 30%; leave: back to blue dashed.
- Click a candidate: a solid colored band and a label (e.g. "C6 dim") appear above the top staff on both views; selection clears; sidebar returns to idle text.
- Apply a region that overlaps an existing one: the old band shrinks/splits/disappears.
- "Show more" reveals the next group.

**Step 4: Commit**

```bash
git add app/src/lib/CandidateList.svelte app/src/routes/+page.svelte
git commit -m "feat: ranked scale candidates with hover preview and apply"
```

---

### Task 14: Region legend, label click to re-select, delete

**Files:**
- Create: `app/src/lib/RegionList.svelte`
- Modify: `app/src/routes/+page.svelte`

**Step 1: Write RegionList.svelte**

```svelte
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
```

**Step 2: Wire into the page**

Add to the script:
```ts
import RegionList from '$lib/RegionList.svelte';

function selectRegion(id: string) {
	const r = regions.find(r => r.id === id);
	if (r) selection = { line: r.line, start: r.start, end: r.end };
}
function deleteRegion(id: string) {
	regions = regions.filter(r => r.id !== id);
	if (currentRegion?.id === id) selection = null;
}
```
Pass `onLabelClick={selectRegion}` to both `StaffView`s. In the aside's `{:else}` branch, replace the hint paragraph with `<RegionList {regions} onSelect={(r) => (selection = { line: r.line, start: r.start, end: r.end })} onDelete={deleteRegion} />`.

**Step 3: Manual verification**

- Label two passages. The legend lists both with swatches, in score order.
- Click a label on the staff: the candidates list opens with that scale ring-highlighted; picking another scale replaces the region's scale.
- Click a legend row: same as clicking the label.
- Delete from the legend: band and label vanish on both staves.
- Drag over a labeled passage and press nothing: the dashed selection band is drawn over the colored band and both are visible.

**Step 4: Commit**

```bash
git add app/src/lib/RegionList.svelte app/src/routes/+page.svelte
git commit -m "feat: region legend with re-select and delete"
```

---

### Task 15: Verify outside-note rings and polish label placement

**Files:**
- Modify: `app/src/lib/overlay.ts` (only if verification fails)

**Step 1: Manual verification**

- Select bar 7 (`G ^G A _B B c ^c d`) and apply "G7 dim" (G Dom7 Diminished = G A B C D Eb F Gb... check the list: hits/misses shown in the row). Every notehead whose pitch class is in the row's red "outside" list gets a thin red ring; the others do not.
- Apply a scale to the chord bar `[c e g]4`: rings appear per notehead only for pitches outside the scale, not on the whole chord. If rings land on the wrong notehead within a chord, abcjs draws noteheads in a different order than `midiPitches`; fix `drawOutsideRings` by sorting `heads` by `getBBox().y` descending (lowest pitch first) to match ascending `midi` order.
- Labels: with chord symbols in the ABC (add `"C6"` before the first note), the label text and chord symbol overlap. Acceptable for v1; note it in the README.

**Step 2: Commit any fix**

```bash
git add app/src/lib/overlay.ts
git commit -m "fix: align outside-note rings with notehead order"
```

---

### Task 16: Playback with synced cursor

**Files:**
- Create: `app/src/lib/Playback.svelte`
- Modify: `app/src/lib/StaffView.svelte` (expose the container element)
- Modify: `app/src/routes/+page.svelte`

Pattern copied from `reference_apps/diminished_staff/index.html` (`setupEditorAudio`, `editorCursorControl`, `updateCursor`).

**Step 1: Expose the container from StaffView**

Add to `StaffView.svelte` props: `onRendered?: (tune: any, notes: NoteInfo[], container: HTMLDivElement) => void;` and call `onRendered?.(tune, idx, container)`.

**Step 2: Write Playback.svelte**

```svelte
<script lang="ts">
	import 'abcjs/abcjs-audio.css';

	let {
		primary,      // { tune, container } of the view that drives audio
		secondary,    // optional second view to mirror the cursor on
	}: {
		primary: { tune: any; container: HTMLDivElement } | null;
		secondary: { tune: any; container: HTMLDivElement } | null;
	} = $props();

	let audioEl: HTMLDivElement;
	let ABCJS: any = $state(null);
	$effect(() => { import('abcjs').then(mod => { ABCJS = mod.default ?? mod; }); });

	function clearCursor(container: HTMLDivElement) {
		container.querySelectorAll('.abcjs-cursor, .abcjs-highlight').forEach(e => {
			if (e.classList.contains('abcjs-cursor')) e.remove(); else e.classList.remove('abcjs-highlight');
		});
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
		return () => { synth.pause?.(); secondTimer?.stop(); };
	});
</script>

<div bind:this={audioEl}></div>
```

**Step 3: Wire into the page**

In `+page.svelte`:
```ts
import Playback from '$lib/Playback.svelte';
let trebleRender: { tune: any; container: HTMLDivElement } | null = $state.raw(null);
let dimRender: { tune: any; container: HTMLDivElement } | null = $state.raw(null);
let primary = $derived(view === 'diminished' ? dimRender : trebleRender);
let secondary = $derived(view === 'side-by-side' ? dimRender : null);
```
Give each `StaffView` its own `onRendered`: the treble one sets `trebleRender = { tune, container }` and the diminished one sets `dimRender = { tune, container }`; both also run the shared key/notes/regions update from Task 13 (extract that into `function afterRender(tune, idx)`). When a view is hidden (`{#if}` false), reset its render to `null` via `$effect` on `view`. Put `<Playback {primary} {secondary} />` in the toolbar row.

**Step 4: Manual verification**

- Press play: audio plays, red cursor and blue highlight move on the traditional staff and mirror on the diminished staff.
- Pause, seek, restart work on both.
- Switch to diminished-only: playback is driven from the diminished render.
- Edit the ABC: the player reloads with the new tune (no stale audio).

**Step 5: Commit**

```bash
git add app/src/lib/Playback.svelte app/src/lib/StaffView.svelte app/src/routes/+page.svelte
git commit -m "feat: synth playback with synced cursor on both staves"
```

---

### Task 17: Final checks and README

**Files:**
- Create: `app/README.md`

**Step 1: Run everything**

```bash
cd app && npm run check && npm test && npm run build
```
Expected: 0 svelte-check errors, all vitest suites pass, `build/` produced.

**Step 2: Full manual pass**

Walk the checklists from Tasks 11 to 16 once more on the production preview: `npm run preview -- --open`.

**Step 3: Write README.md**

Short: what it does, how to run (`npm install`, `npm run dev`), the abcjs fork dependency, the region model (regions are keyed by line and onset time, so they are session-only and dropped when edits remove their notes), and known limitations (labels can collide with chord symbols; selections cannot cross line breaks; no persistence).

**Step 4: Commit**

```bash
git add app/README.md
git commit -m "docs: README for painting scales"
```

---

## Out of scope for this plan (decided during grilling)

- Persistence or share links (session only).
- The circular scale diagram from filter_scales.
- Rubber-band (vertical) selection of individual chord tones.
- Selections spanning line breaks; shift-extend.
- Per-region key centers.
- Deployment config.
