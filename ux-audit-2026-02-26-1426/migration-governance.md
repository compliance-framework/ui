# UI V2 Migration Governance

Last updated: 2026-03-04

This file defines migration operating rules for `@ui/`.

Tracking mode: **Markdown only** (no GitHub Issues/Projects).

## Source-of-Truth Documents

- PRD and task tracker: `ui/ux-audit-2026-02-26-1426/ui-v2-migration-prd.md`
- Route inventory and migration status: `ui/ux-audit-2026-02-26-1426/route-inventory.md`
- This governance file: `ui/ux-audit-2026-02-26-1426/migration-governance.md`

## Pencil-First Implementation Policy (Mandatory)

Pencil is the source of truth for V2 UI. Implementations MUST be derived from the Pencil design and its variables, not invented in code.

Rules:

1. Before implementing or changing any V2 UI element, locate the matching design in `ui/ux-audit-2026-02-26-1426/new-design.pen`.
2. Record the Pencil node id(s) used (frame + component specimen id) in the PRD execution log for that slice.
3. Do not create new layouts/components/styles by interpretation or extrapolation.

If the required element is missing or ambiguous in Pencil:

- Stop and request user approval before implementing.
- Include the closest existing Pencil specimen id(s), what is missing, and one or two concrete options.
- After approval, document the decision in the PRD execution log and update `route-inventory.md` mapping notes when route-family mapping is affected.

## P0-01 PR Slicing Rules

Each migration PR must be a vertical slice and satisfy all rules below.

1. **One route family at a time**
   - Example: SSP list + SSP detail shell + required shared components.
   - Do not combine unrelated route families in one PR.
2. **Component-first for visual parity**
   - If a route needs a V2 primitive (table, tabs, dropdown, banner, drawer), add/update that primitive first in the same PR.
3. **No mixed V1/V2 inside a migrated route family**
   - If a parent route is marked `meta.uiVersion = 'v2'`, child views in active UX paths must not fall back to V1 views.
4. **Required states in the same PR**
   - Add loading/empty/error/no-profile states for each migrated data view.
5. **Behavior parity is mandatory**
   - Preserve auth/session/API behavior and existing route semantics.
6. **Validation in every PR**
   - Run `npm run type-check`, `npm run lint`, `npm run build-only`, `npm run test:unit`.
7. **No design invention**
   - Every V2 visual change must cite Pencil node id(s), or have explicit user approval documented in the PRD execution log.

## P0-02 Definition of Done (Per Route Family)

A route family is complete only when all checks pass:

- [ ] Visual structure matches mapped Pencil frame(s) in `new-design.pen`
- [ ] Uses V2 shell + V2 component primitives (not V1 wrappers restyled)
- [ ] Loading/empty/error/no-profile states implemented and reachable
- [ ] Keyboard navigation and focus order are sane for primary interactions
- [ ] No V1-only component imports remain in migrated routes
- [ ] Tests and checks pass (`type-check`, `lint`, `build-only`, `test:unit`)
- [ ] Route inventory updated with status and notes
- [ ] Pencil reference node id(s) recorded, or explicit user-approved deviation logged in the PRD execution log

## P0-06 Release Gates

Before expanding V2 rollout to additional route families:

1. **Gate A: Design Parity Gate**
   - Migrated route family must visually match Pencil references.
2. **Gate B: UX State Gate**
   - Data states and error handling are complete and consistent.
3. **Gate C: Regression Gate**
   - No auth/session/API regressions in migrated flows.
4. **Gate D: Migration Hygiene Gate**
   - `route-inventory.md` and PRD statuses are current.

## Status Vocabulary

Use only these status values in markdown trackers:

- `not_started`
- `in_progress`
- `blocked`
- `done`

## Update Procedure (Markdown-Only)

After each migration slice:

1. Update `route-inventory.md` row(s): status, current UI state, notes.
2. Update PRD checklist and execution log.
3. If scope changed, update this governance file first, then PRD.
