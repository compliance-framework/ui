# UI V2 migration governance

Last updated: 2026-10-10

Operating rules for the V2 migration. Decisions and the task tracker are in `ui-v2-migration-prd.md`. Tracking is Markdown only.

## Documents

| File                                   | Holds                                                      |
| -------------------------------------- | ---------------------------------------------------------- |
| `ui-v2-migration-prd.md`               | Decisions (§4) and the migration task tracker (§7)         |
| `route-inventory.md`                   | Status per route family                                    |
| `BACKLOG-2026-10-10.md`                | Defects, drift items, open decisions, last synced main SHA |
| `execution-log.md`                     | Dated log of work and approved design deviations           |
| `parity-drift.md`, `browser-pass/*.md` | Evidence from the 2026-10-10 audit                         |
| `seed-data.md`                         | How to load representative local data                      |

Tracker status values: `not_started`, `in_progress`, `blocked`, `done`.

## Design policy

Pencil (`new-design.pen`) is the source of truth for V2 UI.

1. Before implementing or changing a V2 element, find its design in Pencil and record the node ids (frame and specimen) in `execution-log.md`.
2. Don't create layouts, components or styles by interpretation.
3. If an element or state is missing or ambiguous: stop, propose one or two options citing the closest specimen ids, get approval, and log the decision in `execution-log.md`.

### Families without Pencil frames (decision 2026-10-10)

This covers the route families main added (PRD §7.10a) and the tabs in W2-13, W2-14 and W3-18.

- Build only from existing V2 building blocks:
  - layout: `V2PageHeader`, `V2ListPageTemplate`, `V2DetailEditorTemplate`, `V2EditorFormTemplate`, `V2ModalFormTemplate`, `V2WorkspaceDrawer`/`V2EditorDrawer`
  - states: `V2StatePanel`, `PrerequisiteGate`
  - forms: `V2FormField`/`V2FieldError`/`V2FormErrorSummary`
  - feedback and actions: `V2StatusChip`, `V2InlineAlert`, `V2DestructiveActionMenu`
  - the route-aware volt wrappers.
- Use the nearest frame as the layout reference: lists `MRRzf`/`rCe93`, detail with tabs `fC9h5`, drawers `H1pZG`/`bAHLT` in `o41qe`. New visual patterns need approval.
- Log each family in `execution-log.md` with the components used and the reference frame. This entry counts as the logged deviation in the Definition of Done.

## Slice rules

A slice is one PR or commit series on the branch. Each slice:

1. Covers one route family. If it needs a shared V2 primitive, the primitive is built first, in the same slice.
2. Sets `meta.uiVersion: 'v2'` only when every route in the chain imports a V2 view, so no new `V1_in_V2_shell` routes appear.
3. Includes loading, empty, error and no-profile states for each data view.
4. Preserves auth/session/API behavior and route semantics.
5. Passes `make reviewable` and `npm run build`.

## Definition of Done (per route family)

- [ ] Every route in the family renders a V2 view in the V2 shell, with no V1-only component imports.
- [ ] Functional parity with V1 as it is on main, including every drift item for the family (no open rows in BACKLOG section D).
- [ ] Loading, empty, error, no-profile and validation states are implemented and reachable. Forms use `V2FormField`/`V2FieldError`/`V2FormErrorSummary`.
- [ ] Keyboard navigation and focus order work for primary interactions, and screen-reader basics are verified.
- [ ] Visual QA passes against the mapped Pencil frames, or the deviation is logged for a family without frames.
- [ ] Route-level tests are added or updated, and `make reviewable` and `npm run build` pass.
- [ ] `route-inventory.md`, PRD §7 and `execution-log.md` are updated.

## Gate E: cutover gate (once, before release)

- [ ] Every route family in `route-inventory.md` is `done`, or explicitly dropped with a logged decision.
- [ ] No route imports a V1 view, and no `V1_in_V2_shell` rows remain.
- [ ] BACKLOG section D (drift) is empty as of the latest main merge.
- [ ] All P1 items in the backlog are closed.
- [ ] The E2E smoke and critical-flow suites (PRD Q-02, Q-03) pass.
- [ ] A full rehearsal on a `preview`-labelled PR image passes against data loaded per `seed-data.md`.
- [ ] The `/__v2/*` sandboxes are gated or removed, and PRD §7.12 is complete.

## Daily sync routine

See PRD §4.4 for why and for the overlay architecture.

1. Run `git merge main` (merge, not rebase). If a main-owned file conflicts, take main's version and re-apply the branch behavior in its overlay.
2. Run `make reviewable` and `npm run build`. Fix any failure before starting feature work.
3. Run the drift check from the last synced main SHA. For each main commit that touched a V1 file with a V2 copy, port the change the same day or add a row to BACKLOG section D.
4. Update "Last synced main" at the top of the backlog.

## PRs to main

PRs to main are allowed for bugs that exist on main (backlog M2, M3-01, and the V1 half of `both` items), as long as no V2 behavior leaks into main (decision 2026-10-10, PRD §4.1).

1. Branch from `main`, not from the V2 branch. Never cherry-pick branch commits into a main PR.
2. Fix the V1 code only. No V2 components, tokens, CSS variables, fonts, layouts, stores, `meta.uiVersion` tags or `useRouteUiVersion` checks, and no restructuring that only makes sense for V2.
3. Keep the diff minimal and limited to the files the bug needs. Every line touched in a V1 file that has a V2 copy becomes drift on the branch.
4. Follow main's own conventions (`AGENTS.md`, the PR title check, a spec for the bug).
5. After it merges, the fix arrives on the branch with the next daily merge. If the file has a V2 copy, the drift check flags it: port the fix to V2 the same day, or record that V2 already behaves correctly.
6. A `both` item needs two changes: a PR to main for the V1 half, and a branch commit for the V2 half.

## After each slice

1. Update the family's row in `route-inventory.md`.
2. Tick the PRD §7 tasks and add an `execution-log.md` entry.
3. If a rule changes, update this file first.
