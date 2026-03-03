# Controls (Control Implementations) - Functional Tree Redesign - Developer Handoff

Audit package: `ux-audit-2026-02-26-1426`
Target: `/controls` (Control Implementations)
Prototype: `ux-audit-2026-02-26-1426/new-design.pen`
Design frames:

- `App / Controls / Explorer (Concept) / Latte` (`c2uFy`)
- `App / Controls / Functional Tree (Concept) / Latte` (`YMNpx`) (primary)

Style guide: `webapp-01-industrialtechnical_latte` (see `ux-audit-2026-02-26-1426/style-guides/latte.md`)
Design language: "Design System / Components / Latte"
Viewport: Desktop web `1440px` wide (prototype frame is taller; page scroll is expected)

## 1) Purpose (What `/controls` is)

`/controls` is the Control Implementation workspace for the currently selected System Security Plan (SSP).

From a user standpoint:

- It shows the controls that are in-scope for the SSP (driven by the SSP's linked OSCAL Profile).
- It is where users write implementation narratives (by-component) and manage statement implementations.
- It surfaces evidence/compliance rollups per control (based on linked dashboards/filters).

From an app standpoint, `/controls` is an overlay of:

- A resolved Profile Catalog (tree/navigation)
- The SSP's `control-implementation` (what the org has written so far)
- Evidence compliance rollups for each control

## 2) Current Implementation (Ground Truth)

### Routes / Entry

- Route: `/controls` -> `ui/src/views/control-implementations/IndexView.vue`
- If no SSP selected: error gate.
- If SSP has no linked profile: error gate.

### Data sources (UI)

`ui/src/views/control-implementations/IndexView.vue` loads:

- Profile for SSP: `GET /api/oscal/system-security-plans/{sspId}/profile`
- Resolved catalog for profile: `GET /api/oscal/profiles/{profileId}/resolved`
- Control implementation: `GET /api/oscal/system-security-plans/{sspId}/control-implementation`

Evidence rollups per control:

- `ui/src/views/control-implementations/partials/ControlEvidenceCounter.vue` calls
  `GET /api/evidence/compliance-by-control/{controlId}` and only renders a badge when `counts.total > 0`.
  Counts are computed by `ui/src/composables/useEvidenceStatusCounts.ts`:
  - `satisfied` -> green
  - `not-satisfied` -> red
  - anything else / missing -> gray

### Interaction model (UI)

Control-level OPEN:

- The Eye button calls `openImplementationDrawer(req)` and opens the control drawer with `ImplementedRequirement.byComponents`.
- This assumes an `ImplementedRequirement` exists for the control in the loaded `control-implementation` payload.

Statement-level IMPLEMENT:

- Statement implementation drawer is opened by clicking a catalog `part` where `part.name == 'statement'`.
- Code path: `ui/src/views/control-implementations/partials/IndexControlImplementation.vue`.
- If the control has no `ImplementedRequirement` yet, it is created on-demand via:
  `POST /api/oscal/system-security-plans/{sspId}/control-implementation/implemented-requirements`.

Key limitation:

- If a control has no catalog `parts` with `name == 'statement'`, the current UI renders an empty statement block (no click targets), so statement implementation is effectively undiscoverable from `/controls`.

### Backend behavior that matters

Profile attach creates implemented requirements:

- `PUT /api/oscal/system-security-plans/{id}/profile` (`AttachProfile`) bulk-creates missing `ImplementedRequirement` rows for every control resolved from the profile.
- Implementation reference: `api/internal/api/handler/oscal/system_security_plans.go` (`AttachProfile`).

Statement creation exists, but needs a statement ID:

- API supports creating statements: `POST /api/oscal/system-security-plans/{id}/control-implementation/implemented-requirements/{reqId}/statements`.
- UI form validates `statementId` is required: `ui/src/components/system-security-plans/StatementCreateForm.vue`.

This means:

- A control can be in scope and have an `ImplementedRequirement` even if the catalog has no statement parts.
- Evidence for a control can exist or not; if the evidence endpoint returns `[]`, the current UI shows nothing.

## 3) Problem Statement (From this thread)

Observed user pain:

- The page reads like "just a tree"; users cannot tell what is actionable, what the badges mean, or where implementation happens.
- Click targets are unclear (statements look like static prose).
- Some catalogs/controls have missing statement parts, leading to "blank" areas.

Colleague feedback and validation:

- Some OSCAL catalogs "don't really have statements" (or specific controls don't), so a statement-driven design can look broken.
- We reproduced this on the running app via Chrome DevTools:
  - `ac-14.1 Necessary Uses` has no catalog statement parts and renders an empty statement card.
  - Additional examples encountered in-page: `ac-17.5`, `ac-17.7`, `ac-17.8`.

How to reproduce in local-dev (seeded data):

- Select SSP: `FedRAMP System Security Plan (SSP)` (it has a profile attached in local-dev).
- Go to `/controls`.
- Expand: `Access Control` -> `Permitted Actions Without Identification or Authentication (ac-14)` -> `Necessary Uses (ac-14.1)`.
- Expected current behavior: statement area is blank (no catalog statement parts).

The initial "DSO_176" lead:

- We investigated local-dev seed data and the running Postgres container and found no `DSO_176` record in seed inputs or the DB.
- Conclusion: the colleague was pointing at the general "missing statement parts" phenomenon, not a specific seeded record.

## 4) Design Direction Chosen

We explored two concepts:

1. A split-pane Explorer (tree left, inspector right): `c2uFy`.
2. A tree-first, more functional tree-table: `YMNpx` (selected direction).

The chosen direction keeps the tree structure but makes the tree itself a functional workspace:

- Clear columns: `NODE`, `STATUS`, `COMPONENTS`, `EVIDENCE`, `ACTION`.
- Row types are visually and structurally distinct:
  - Group rows (family/section)
  - Control rows
  - Statement rows (only when the catalog provides statement parts)
- Evidence is shown as colored chips (OK/UNK/ERR) where data exists.
- Missing statement parts are surfaced explicitly as a `NO STMT` chip.

## 5) Screen Spec: `App / Controls / Functional Tree (Concept) / Latte` (`YMNpx`)

### Layout

- Header (64px) + sidebar (240px) + content area.
- Content header includes:
  - Active SSP/Profile context
  - KPI mini-cards: in-scope, in-progress, needs evidence (conceptual, see §8 for implementation constraints)

### Toolbar

- Search input (kept aligned to 44px control height).
- Filter chips: `NOT STARTED`, `IN PROGRESS`, `NEEDS EVIDENCE`.
  - These are present in the design as a UI affordance, but they are not implemented in `/controls` today.
  - See §8 for what is realistically derivable from existing endpoints.

Decisions made in-thread:

- We removed `EXPAND ALL` / `COLLAPSE` buttons from the concept per request.
- Note: helper methods exist (`expandAll`, `collapseAll`) in `ui/src/composables/useCatalogTree/index.ts`, but the current `/controls` view does not surface them.
- We fixed alignment issues so all toolbar controls share consistent height and baseline.

### Tree-table rows

Group row:

- Node cell shows chevron + group ID badge + group title.
- STATUS/COMPONENTS/EVIDENCE show rollups (conceptual).
- ACTION shows `OPEN` (conceptual navigation action).

Control row:

- Node cell shows indentation + chevron + control ID + control title.
- ACTION shows `OPEN`.
  - This maps to the existing Eye/implementation drawer (control-level by-components).

Statement row:

- Node cell shows deeper indentation + statement ID + short label.
- ACTION shows `IMPLEMENT`.
  - This maps to the existing statement implementation drawer opened by selecting a catalog statement `part`.

### Evidence column (chips)

Decision made in-thread:

- Evidence is represented as chips with semantic colors:
  - OK (green)
  - UNK (neutral gray)
  - ERR (red)

Accuracy constraints:

- In the current UI, evidence is only shown when `GET /api/evidence/compliance-by-control/{controlId}` returns counts with `total > 0`.
- For controls with no evidence data, we switched the concept to a neutral `NO DATA` chip (instead of inventing `UNK 6`).
  - Validation example: `GET /api/evidence/compliance-by-control/ac-14.1` returns `[]` in the seeded local-dev DB, so the current UI renders no evidence badge for `ac-14.1`.

## 6) Handling the "No Statement" Branch (Required)

This is the most important thread outcome.

Ground truth:

- Some controls exist in the resolved catalog tree but have no `parts[name='statement']`.
- Example validated in the running app: `ac-14.1`.

Design handling chosen (API/data-model compatible):

- Control rows can exist without any statement child rows.
- Such controls must be explicitly marked to avoid the UI looking broken:
  - STATUS shows a `NO STMT` chip.
- The control still has `OPEN` in ACTION.
  - Rationale: control-level `ImplementedRequirement` exists due to profile attach; control-level by-components drawer is still valid.
- Evidence for these controls may be missing; show `NO DATA` (neutral) when evidence endpoint returns empty.

Rejected approach (explicitly removed):

- We initially mocked a synthetic generated statement row (`ccf_stmt.1`) and a `SYNTHETIC` label.
- This was removed because the current implementation has no data-model marker for "synthetic" and `/controls` has no supported flow to generate statement IDs for statement-less controls.

## 7) Visual Semantics / Color Decisions

Decision made in-thread:

- Orange/amber row background must represent one meaning only.
- We keep amber row background for "selected/current" row.
- Exception states (like `NO STMT`) are represented via chips (not row background), to avoid dual-meaning highlights.

## 8) Can We Actually Implement This (No Fake UI)?

This section captures the feasibility decisions from the thread.

### OPEN action

Supported today.

- Maps to the existing control-level implementation drawer (Eye button).
- Works even when a control has no statement parts, because implemented requirements are created during profile attach.

### IMPLEMENT action

Supported only when the catalog provides statement parts.

- Current `/controls` only opens statement implementation via selecting a statement `part` from the catalog.
- For "NO STMT" controls, IMPLEMENT should not be shown as an available statement-row action because statement rows do not exist.

### Filters: NOT STARTED / IN PROGRESS / NEEDS EVIDENCE

Not implemented in the current `/controls` page.

They are feasible only as derived filters:

- `NOT STARTED` cannot mean "no implemented requirement", because `AttachProfile` creates them.
  Practical definitions using existing data/endpoints:
  - "No statement implementations and no by-components" from `GET /control-implementation`.
  - Or use `GET /api/oscal/profiles/{profileId}/compliance-progress?includeControls=true&sspId={sspId}` (used by the Compliance view) as a single source of per-control progress.

- `IN PROGRESS` is not a first-class status today; it needs an agreed definition.

- `NEEDS EVIDENCE` can be derived from evidence rollups:
  - Evidence endpoint per control (`/api/evidence/compliance-by-control/{controlId}`) or compliance-progress control statuses.

Thread decision:

- Keep filter chips in the design as a direction, but do not claim they already exist in `/controls`.

## 9) Implementation Notes (Expected Touch List)

Primary view:

- `ui/src/views/control-implementations/IndexView.vue`
- `ui/src/views/control-implementations/partials/IndexControlImplementation.vue`
- `ui/src/views/control-implementations/partials/ControlEvidenceCounter.vue`

Supporting (data + reuse):

- `ui/src/composables/useCatalogTree/index.ts` (tree building)
- `ui/src/composables/useEvidenceStatusCounts.ts` (status -> counts)
- `ui/src/volt/Tree.vue` (PrimeVue Tree wrapper; provides built-in search)

Backend references:

- `api/internal/api/handler/oscal/system_security_plans.go`:
  - `AttachProfile` (bulk create implemented requirements)
  - `CreateImplementedRequirementStatement` (statement create endpoint)

## 10) Acceptance Criteria / QA Checklist

- Tree remains the primary structure (groups -> controls -> optional statement rows).
- Every visible badge/chip/action is derivable from existing data or endpoints.
- Controls with no catalog statements are not silent failures:
  - Visible `NO STMT` chip in STATUS.
  - No misleading IMPLEMENT action.
- Evidence display respects current semantics:
  - If evidence endpoint returns no data, show neutral placeholder (or show nothing; design currently uses `NO DATA` chip).
- Selection highlight is single-meaning (no dual-use amber backgrounds).

## 11) References (Thread-derived)

- Missing statement cases validated in running app:
  - `ac-14.1` (no statement parts)
  - `ac-17.5`, `ac-17.7`, `ac-17.8` (no statement parts)
- Key UI code paths:
  - Statement rendering depends on `parts[name='statement']`: `ui/src/views/control-implementations/partials/IndexControlImplementation.vue`
  - Evidence badge hides when `total == 0`: `ui/src/views/control-implementations/partials/ControlEvidenceCounter.vue`
- Prototype file: `ux-audit-2026-02-26-1426/new-design.pen`
