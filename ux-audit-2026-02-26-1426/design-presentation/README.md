# Design HTML Presentation

This is a browser-based presentation shell for design frames exported from `new-design.pen`.

## What it provides

- Area navigation (SSP, Auth)
- Flow navigation across frames in each area
- Explanatory panel for each frame
- Keyboard shortcuts for review
- Full-screen app mode (presentation chrome hidden)
- Pure HTML/CSS rendering (no iframe)
- Lucide-style icons rendered as inline SVGs (no webfont dependency)

## Files

- `index.html`: presentation shell
- `styles.css`: shell + renderer styles
- `app.js`: frame renderer, area + flow navigation, full-screen controls
- `areas/<area>/flow.js`: frame order + custom notes per area
- `areas/<area>/frames-data.js`: generated frame data per area
- `scripts/generate-frames-data.mjs`: regeneration script for all areas

## Run locally

From `ui/ux-audit-2026-02-26-1426/design-presentation`:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## Regenerate frame data

If `new-design.pen` changes, regenerate area frame data:

```bash
node scripts/generate-frames-data.mjs
```
