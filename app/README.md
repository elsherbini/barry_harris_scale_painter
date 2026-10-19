# Painting Scales

Type ABC notation, drag-select a passage on the rendered staff, see which Barry Harris scales fit, and "paint" the chosen scale onto the music as a colored band with a label.

## Running

```sh
npm install
npm run dev -- --open
```

`npm test` runs the vitest unit tests for the pure modules, `npm run check` runs svelte-check, `npm run build` produces a static site in `build/`.

`.npmrc` sets `legacy-peer-deps=true` because npm 10 fails to resolve vitest 4's optional peer dependencies otherwise.

## How it works

- **abcjs fork.** Notation is rendered with `https://github.com/elsherbini/abcjs` (branch `main`), which adds `clef=diminished` and the `diminishedColors` render option. `src/lib/abc.ts` rewrites the ABC for the diminished view.
- **Note index.** After each render, `tune.setUpAudio()` stamps every sounding note with key-signature-resolved MIDI pitches and an onset time. `src/lib/notes-index.ts` turns that into a flat list with each note's SVG element and bounding box.
- **Selection.** `src/lib/drag-select.ts` listens for pointer events on the SVG. A horizontal drag on one system line selects every note (all voices and staves) whose x-center falls in the dragged range. Click a note to select just that onset, click empty space or press Escape to clear.
- **Regions.** A labeled passage is `{ line, start, end, scaleName }` keyed by onset time, so the same region draws on both the traditional and diminished staves. Painting over an existing region trims, splits or removes it (`src/lib/regions.ts`).
- **Matching.** `src/lib/match.ts` groups the 45 scales by how many selected pitch classes they miss, and sorts within a group by overlap with the key center. The key defaults to the ABC `K:` field and can be overridden in the sidebar.
- **Overlays.** `src/lib/overlay.ts` inserts translucent `<rect>`s right after each `g.abcjs-staff` group (above the staff lines, below the notes), a short label above the line, and a red ring on noteheads outside the region's scale.
- **Colors** come from the Excalidraw scale diagram in the filter_scales reference app. Scales a minor third apart share a color.

## Known limitations

- State is session-only: reload and the labels are gone.
- Selections cannot cross a line break.
- Editing the ABC keeps regions whose notes still exist at the same onsets, and drops the rest.
- Labels are placed above everything on the line, so they can sit high when the line has chord symbols or very high notes.
