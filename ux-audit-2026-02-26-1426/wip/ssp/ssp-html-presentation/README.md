# SSP HTML Presentation

This is a browser-based presentation shell for SSP design frames from `new-design.pen`.

## What it provides

- Flow navigation across SSP frames
- Explanatory panel for each frame
- Keyboard shortcuts for review
- Full-screen app mode (presentation chrome hidden)
- Pure HTML/CSS rendering (no iframe)
- Lucide-style icons rendered as inline SVGs (no webfont dependency)

## Files

- `index.html`: presentation shell
- `styles.css`: shell + renderer styles
- `app.js`: frame renderer, flow navigation, full-screen controls
- `flow.js`: frame order + custom notes
- `frames-data.js`: generated SSP frame data
- `scripts/generate-frames-data.mjs`: regeneration script

## Run locally

From `ui/ux-audit-2026-02-26-1426/wip/ssp-html-presentation`:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## Regenerate frame data

If `new-design.pen` changes, regenerate `frames-data.js`:

```bash
node scripts/generate-frames-data.mjs
```
