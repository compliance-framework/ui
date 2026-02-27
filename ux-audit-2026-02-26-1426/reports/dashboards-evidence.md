# UX Audit: Dashboards + Evidence (A2)

Viewport: 1440x900 (desktop)

States covered:

- Fresh state (storage cleared; no SSP selected)
- Configured state (SSP set in-session)

Routes covered:

- `/` (lands on Evidence)
- `/evidence`, `/evidence/create`, `/evidence/:id`, `/evidence/:id/update`, `/evidence/history/:uuid`
- `/dashboards`, `/dashboards/create`

## Findings

### A2-UX-EVID-01 — Evidence search affordance is hard to parse; list rows become chip-heavy

- Area/Module: Evidence
- Route/URL: `/evidence`
- Preconditions: Logged in
- Steps to reproduce:
  1. Go to `/evidence`
  2. Look at the search field placeholder and the label chips on results
- Expected vs Actual:
  - Expected: Search hints that teach the syntax (or a builder/help); results that stay scannable at a glance.
  - Actual: Placeholder uses a complex, “dummy” expression (e.g., `foo=bar AND ...`), and rows can contain many long chips that expand row height and reduce scan speed.
- Impact: Low discoverability for search syntax; reduced list density and comparability between rows.
- Severity: P2
- Heuristic tags: Content/Copy, Efficiency, Visual Hierarchy
- Evidence: desktop**dashboards-evidence**evidence**fresh**01.png, desktop**dashboards-evidence**evidence**configured**01.png
- Recommendation:
  - Replace placeholder with short examples + a “Search syntax” help link (or add a tokenized filter builder).
  - Collapse chips (e.g., show first 2–3 + “+N more”) and allow expand-on-demand.

### A2-UX-EVID-02 — Charts/panels render “blank” without clear loading/empty messaging

- Area/Module: Evidence, Evidence History
- Route/URL: `/`, `/evidence`, `/evidence/history/:uuid`
- Preconditions: Logged in
- Steps to reproduce:
  1. Go to `/` or `/evidence`
  2. Observe “Compliance over time” and “Agent health” panels
  3. Go to `/evidence/history/:uuid` and observe the same panels
- Expected vs Actual:
  - Expected: Clear states (loading, no data, error) with concise copy and/or skeletons.
  - Actual: Panels can appear as empty boxes/gradients with no explanation, making it unclear whether data is loading, missing, or failed.
- Impact: Low confidence; users may assume the app is broken or data is unavailable.
- Severity: P2
- Heuristic tags: Feedback/Status, Performance/Latency, Visual Hierarchy
- Evidence: desktop**dashboards-evidence**home**fresh**01.png, desktop**dashboards-evidence**home**configured**01.png, desktop**dashboards-evidence**evidence-history**fresh**01.png
- Recommendation:
  - Add explicit states: skeleton while loading; “No data yet” empty copy; inline error with retry.

### A2-UX-EVID-03 — Evidence create flow: required dates are not obvious; validation redirects into date picker

- Area/Module: Evidence
- Route/URL: `/evidence/create`
- Preconditions: Logged in
- Steps to reproduce:
  1. Go to `/evidence/create`
  2. Click “Create Evidence” without selecting dates
- Expected vs Actual:
  - Expected: Required fields are marked; submit shows clear inline errors (or defaults dates sensibly).
  - Actual: No clear “required” indicators; clicking submit opens the date picker as an implicit error/redirect with no explanatory message.
- Impact: Users can’t quickly understand why submission didn’t work; slows down create flow.
- Severity: P1
- Heuristic tags: Error Prevention, Feedback/Status, Efficiency
- Evidence: desktop**dashboards-evidence**evidence-create**fresh**01.png, desktop**dashboards-evidence**evidence-create**configured**01.png
- Recommendation:
  - Mark required fields; show inline errors next to Start/End Date.
  - Consider defaulting Start/End Date to “today” and/or making End Date optional.

### A2-UX-EVID-04 — “Update Evidence” behaves like “create a new version” but UI doesn’t explain it

- Area/Module: Evidence
- Route/URL: `/evidence/:id/update`, `/evidence/history/:uuid`
- Preconditions: Logged in; have an existing Evidence record
- Steps to reproduce:
  1. Open an Evidence detail page
  2. Click “Update Evidence”
  3. Change Description/Reason and submit
  4. Open Evidence History for the UUID
- Expected vs Actual:
  - Expected: If updates create a new version, the UI should say so (and show a version timeline / change summary).
  - Actual: History shows multiple entries with the same title/time, with no “what changed” context; the detail view doesn’t clearly communicate versioning semantics.
- Impact: Confusing mental model; users may think they edited in place but actually created a new revision.
- Severity: P1
- Heuristic tags: Consistency/Standards, Feedback/Status, Control/Freedom
- Evidence: desktop**dashboards-evidence**evidence-update**fresh**01.png, desktop**dashboards-evidence**evidence-update**fresh**02.png, desktop**dashboards-evidence**evidence-history**fresh**01.png
- Recommendation:
  - Rename CTA to “Create new version” (or equivalent) if that’s the behavior.
  - On History, show revision numbers, author/time, and a brief change summary; highlight the latest.

### A2-UX-EVID-05 — Evidence detail “Media” section lacks an empty state and primary attachment action

- Area/Module: Evidence
- Route/URL: `/evidence/:id`
- Preconditions: Logged in; Evidence without attachments
- Steps to reproduce:
  1. Open an Evidence detail page for an item with no media
  2. Look at the “Media” panel
- Expected vs Actual:
  - Expected: Empty state copy (“No attachments yet”) plus a clear CTA (Upload / Add link).
  - Actual: Panel appears empty with no guidance or obvious next action.
- Impact: Missed affordance; users may not realize media is supported.
- Severity: P2
- Heuristic tags: Feedback/Status, Discoverability, Efficiency
- Evidence: desktop**dashboards-evidence**evidence-id**fresh**01.png
- Recommendation:
  - Add empty state + “Add attachment” CTA (and/or show upload affordance on detail).

### A2-UX-EVID-06 — Dashboards list prioritizes destructive actions and is low-density

- Area/Module: Dashboards
- Route/URL: `/dashboards`
- Preconditions: Logged in
- Steps to reproduce:
  1. Go to `/dashboards`
  2. Scan available actions per dashboard card
- Expected vs Actual:
  - Expected: Primary actions are “View”/“Edit”; destructive actions are secondary with confirmation.
  - Actual: Each card has a large, high-salience red “Delete” button; cards contain a lot of empty space, reducing list density.
- Impact: Elevated risk of accidental deletion; slower scanning across many dashboards.
- Severity: P1
- Heuristic tags: Error Prevention, Visual Hierarchy, Efficiency
- Evidence: desktop**dashboards-evidence**dashboards**fresh**01.png, desktop**dashboards-evidence**dashboards**configured**01.png
- Recommendation:
  - Make “View” the primary action; move “Delete” into a kebab/menu with confirm.
  - Increase density (smaller cards, tighter spacing, optional compact view, sorting/filtering).

### A2-UX-EVID-07 — Dashboard create flow lacks clear validation and guidance on required fields

- Area/Module: Dashboards
- Route/URL: `/dashboards/create`
- Preconditions: Logged in
- Steps to reproduce:
  1. Go to `/dashboards/create`
  2. Click “Submit” with missing/empty selections
- Expected vs Actual:
  - Expected: Required fields are marked; submission shows inline validation messages.
  - Actual: No clear required indicators and no visible validation feedback when submit doesn’t proceed.
- Impact: User can get “stuck” without knowing what’s missing.
- Severity: P1
- Heuristic tags: Error Recovery, Feedback/Status, Content/Copy
- Evidence: desktop**dashboards-evidence**dashboards-create**fresh**01.png, desktop**dashboards-evidence**dashboards-create**fresh**02.png
- Recommendation:
  - Add required indicators + inline field errors.
  - Add helper text for “Result Filter” (examples + supported operators).

### A2-UX-EVID-08 — SSP context is not discoverable on Dashboards/Evidence after setting an active plan

- Area/Module: Dashboards, Evidence
- Route/URL: `/system-security-plans`, `/dashboards`, `/evidence`
- Preconditions: Logged in; SSP set active
- Steps to reproduce:
  1. Go to `/system-security-plans` and click “Set” on an SSP
  2. Revisit `/dashboards` and `/evidence`
- Expected vs Actual:
  - Expected: The active SSP is visible in global context (header/breadcrumb) so users know what they’re viewing.
  - Actual: Active SSP is shown on the SSP list (badge), but dashboards/evidence pages don’t surface the active plan context.
- Impact: Users may misinterpret results as “global” rather than scoped to the active SSP.
- Severity: P2
- Heuristic tags: Navigation/IA, Feedback/Status, Consistency/Standards
- Evidence: desktop**dashboards-evidence**ssps**configured**01.png, desktop**dashboards-evidence**dashboards**configured**01.png, desktop**dashboards-evidence**evidence**configured**01.png
- Recommendation:
  - Show active SSP name in the main header (or a persistent scope pill) with a quick switch/link.

## Pattern notes

- List actions: Evidence rows provide “History” + “View” (good), but dashboard cards emphasize “Delete” (inconsistent action hierarchy).
- Empty states: “Media” and chart panels frequently appear blank without an explicit empty/loading message.
- Copy/guidance: Query/filter fields rely on users knowing syntax; placeholders are not teachable.
- Consistency: “Update Evidence” behaves like revisioning; labeling should match the underlying model.

## Appendix: scenarios attempted but not reproduced

- Dashboards detail route (`/dashboards/:id`): no clear “View”/card click affordance found from the dashboards list; only “Delete” was obvious.
- Evidence/dashboards error states (server failure): not reproduced during this run.
