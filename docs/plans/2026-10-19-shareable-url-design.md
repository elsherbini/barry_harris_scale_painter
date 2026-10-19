# Shareable URL design

Date: 2026-10-19

## Goal

Make it easy to share a link that reproduces the current tune and its labelled
passages. Opening the link shows exactly what the sender saw.

## URL shape and encoding

State lives in the URL fragment so it never reaches a server and works with the
static, prerendered build:

    https://…/#s=<base64url(deflate-raw(JSON))>

The JSON document is versioned:

```json
{ "v": 1, "abc": "X:1\nT:…", "regions": [[0, 0, 1.5, "C Maj6 Diminished"]],
  "view": "traditional", "colors": "bw", "acc": "flat", "key": null }
```

- Regions are compact tuples: line, start, end, scale name. Ids are not stored
  and are regenerated on load.
- `key` is `null` (follow the ABC), `"none"` (no key), or `{ root, mode }`.
- Compression uses the browser's native `CompressionStream('deflate-raw')` and
  base64url. No new dependency. Für Elise with a few labels is roughly 1 to
  1.5 KB of URL.
- `share.ts` exposes pure `encodeState` and `decodeState`. Decoding is
  defensive: a malformed token or unknown version yields `null` and the app
  falls back to defaults.

## Keeping the URL and the app in sync

- On load the page reads the fragment before the first staff render, so the
  default tune never flashes. If it decodes, abc, regions, view, colors,
  spelling and key override come from it; otherwise defaults apply.
- Regions from the URL go straight into the regions array. The existing
  afterRender pruning drops any region that points at no notes, so a stale
  link degrades gracefully with no new validation path.
- One effect watches the shareable state and writes the fragment with
  `history.replaceState`, debounced about 300 ms so typing in the editor does
  not churn the address bar. replaceState keeps Back working.
- When the state equals the defaults the fragment is cleared, so a fresh visit
  keeps a clean address.
- Selection, preview and the editor toggle are transient and not stored.

## Copy link control

A `Copy link` button in the toolbar flushes any pending debounced update, then
writes `location.href` to the clipboard. The label reads `Copied` for about two
seconds. If the clipboard call fails, a small read-only field shows the URL for
manual copying.

## Testing

- Unit tests for `share.ts`: full round trip, region tuples, `null` and
  `"none"` key, malformed token, unknown version, defaults encode to an empty
  fragment. Node ships `CompressionStream`, so no polyfill.
- Page-level check with headless Chrome: open a URL carrying Für Elise with two
  regions, confirm two region pills render and the address bar holds the token.

## Deliverables

- New `app/src/lib/share.ts` and `share.test.ts`.
- `+page.svelte`: load from fragment, sync effect, copy button.
- No new dependencies.
