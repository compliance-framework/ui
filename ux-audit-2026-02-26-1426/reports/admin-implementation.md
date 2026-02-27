# UX Audit (A6) - Admin + Implementation

Run id: ux-audit-2026-02-26-1426  
Agent: A6  
Focus: cross-module inconsistencies in list/actions/editor tabs; "Set" placement/feedback; deep links; empty/loading/error; dialogs/toasts.

## Findings

### Issue ID: A6-UX-EVID-01

- Title: "Set" action feedback is subtle and label never changes
- Area/Module: Implementation (SSP)
- Route: `/system-security-plans`
- Preconditions: Logged in as admin; no SSP currently active.
- Steps to reproduce:
  1. Go to System Security Plans.
  2. Click `Set` for any SSP.
- Expected vs Actual:
  - Expected: Clear confirmation (toast/dialog) and the action changes to reflect state (e.g., `Active`, `Unset`, `Set active`).
  - Actual: A small `Active` badge appears next to the title, but the row action still reads `Set` and there is no obvious confirmation message.
- Impact: Users can miss the state change and may click `Set` repeatedly or leave unsure which SSP is currently used elsewhere.
- Severity: P1
- Heuristic tags (1-3): Feedback/Status, Consistency/Standards
- Evidence: `desktop__admin-implementation__system-security-plans__fresh__02.png`, `desktop__admin-implementation__system-security-plans__configured__01.png`
- Recommendation: Replace `Set` with a stateful control (e.g., `Active` (disabled) + `Make Active` on others, or `Unset`), and show a toast confirming which SSP is now active.
- Notes: The "Active" indicator is not present on other implementation lists unless separately set.

### Issue ID: A6-UX-EVID-02

- Title: Destructive actions exposed as primary row actions (Catalogs)
- Area/Module: Admin/System (Catalogs)
- Route: `/catalogs`
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Go to Catalogs.
  2. Observe per-row actions.
- Expected vs Actual:
  - Expected: Destructive actions are de-emphasized (overflow menu) and/or require an explicit confirmation step.
  - Actual: `Delete` is presented alongside `View` and `JSON` for every row, making it feel like a normal primary action.
- Impact: Higher risk of accidental deletion; users must visually parse each row to avoid the destructive button.
- Severity: P1
- Heuristic tags (1-3): Error Prevention, Control/Freedom
- Evidence: `desktop__admin-implementation__catalogs__configured__01.png`
- Recommendation: Move `Delete` into a kebab/overflow menu, add stronger confirmation copy, and consider role-based visibility.
- Notes: Similar list pages (e.g., SSP/AP/AR/POA&M) do not show destructive actions inline.

### Issue ID: A6-UX-EVID-03

- Title: Editor tab UI is inconsistent across implementation modules
- Area/Module: Implementation (SSP/AP/AR/POA&M) + Inventory (Profiles/Component Definitions)
- Route:
  - `/system-security-plans/<id>`
  - `/assessment-plans/<id>`
  - `/assessment-results/<id>`
  - `/plan-of-action-and-milestones/<id>`
  - `/profiles/<id>`
  - `/component-definitions/<id>`
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Open any detail page in each module.
  2. Compare the tab/navigation patterns.
- Expected vs Actual:
  - Expected: A consistent tab style (visuals, placement, naming) so users can transfer learning.
  - Actual: Tabs vary by module (different spacing, underline behavior, link-vs-tab semantics), and labels differ (`JSON` vs `JSON View`). POA&M uses many narrow tabs that wrap and create scanning friction.
- Impact: Increased cognitive load; users waste time re-learning navigation per module and can miss key sections.
- Severity: P2
- Heuristic tags (1-3): Consistency/Standards, Visual Hierarchy
- Evidence: `desktop__admin-implementation__system-security-plans-detail__configured__01.png`, `desktop__admin-implementation__assessment-plans-detail__configured__01.png`, `desktop__admin-implementation__assessment-results-detail__configured__01.png`, `desktop__admin-implementation__plan-of-action-and-milestones-detail__configured__01.png`, `desktop__admin-implementation__profiles-detail__fresh__01.png`, `desktop__admin-implementation__component-definitions-detail__fresh__01.png`
- Recommendation: Standardize a single tab component across these editors (including a consistent `JSON` label), and consider grouping/secondary navigation for POA&M to reduce the number of top-level tabs.
- Notes: This also affects deep-linking because users may not be confident where they are within a document.

### Issue ID: A6-UX-EVID-04

- Title: Primary action placement differs widely between detail pages
- Area/Module: Implementation + Inventory
- Route/URL: Multiple (detail pages)
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Open Component Definition, Assessment Plan, and POA&M details.
  2. Compare where the main "edit/manage" actions appear.
- Expected vs Actual:
  - Expected: A consistent action zone (top-right header or a sticky action bar) with predictable button styles.
  - Actual: Component Definition shows prominent colored buttons near the top of the metadata card; Assessment Plan places `Edit Assessment Plan` / `Manage Tasks` lower in the content; POA&M uses a separate "Actions" card; SSP uses a mix (combobox + multiple edit buttons).
- Impact: Slower task execution and more scrolling/hunting for actions.
- Severity: P2
- Heuristic tags (1-3): Efficiency, Consistency/Standards
- Evidence: `desktop__admin-implementation__component-definitions-detail__fresh__01.png`, `desktop__admin-implementation__assessment-plans-detail__configured__01.png`, `desktop__admin-implementation__plan-of-action-and-milestones-detail__configured__01.png`, `desktop__admin-implementation__system-security-plans-detail__configured__01.png`
- Recommendation: Define a shared detail-page header pattern with consistent placement for primary actions (Edit/Manage/Download) and keep secondary actions in an overflow menu.
- Notes: Button color usage varies (blue/green/purple) without a consistent semantic legend.

### Issue ID: A6-UX-EVID-05

- Title: Create CTAs are inconsistent in placement and wording on list pages
- Area/Module: Admin + Implementation
- Route:
  - `/assessment-plans`
  - `/assessment-results`
  - `/plan-of-action-and-milestones`
  - `/catalogs`
  - `/component-definitions`
  - `/users`
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Visit list pages across modules.
  2. Look for the create/new action.
- Expected vs Actual:
  - Expected: Create CTA in a consistent location (e.g., top-right above the table) with consistent naming (`Create <Thing>`).
  - Actual: Create buttons appear below the table (AP/AR/POA&M), top-right (Catalogs), or as a link at the end (Component Definitions), and labels vary (`Create New POAM`, `Create New Assessment Results`, `Create Assessment Plan`).
- Impact: Discoverability issues, especially for new users; inconsistent scanning patterns.
- Severity: P2
- Heuristic tags (1-3): Consistency/Standards, Visual Hierarchy
- Evidence: `desktop__admin-implementation__assessment-plans__fresh__01.png`, `desktop__admin-implementation__assessment-results__fresh__01.png`, `desktop__admin-implementation__plan-of-action-and-milestones__fresh__01.png`, `desktop__admin-implementation__catalogs__configured__01.png`, `desktop__admin-implementation__component-definitions__fresh__01.png`, `desktop__admin-implementation__users__fresh__01.png`
- Recommendation: Standardize list headers to include a right-aligned primary CTA (`Create`), plus a consistent table action column.
- Notes: The implementation lists also include `Set` which increases action density in the same column.

### Issue ID: A6-UX-EVID-06

- Title: Import page appears duplicated and disabled states lack guidance
- Area/Module: Admin
- Route: `/admin/import`
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Open Admin Import.
  2. Observe the upload/import controls.
- Expected vs Actual:
  - Expected: A single, clearly labeled import workflow with guidance on supported formats and clear empty/disabled explanations.
  - Actual: Two similar upload sections are visible, each with `click to browse` and disabled `Import`/`Clear`, with no obvious explanation of why there are two or what each is for.
- Impact: Confusion and increased chance of importing into the wrong target (or assuming the page is broken).
- Severity: P2
- Heuristic tags (1-3): Content/Copy, Feedback/Status
- Evidence: `desktop__admin-implementation__admin-import__fresh__01.png`, `desktop__admin-implementation__admin-import__configured__01.png`
- Recommendation: Label the sections (or consolidate), add short helper text for accepted files and what will happen after import, and explain disabled states (e.g., "Select a file to enable Import").
- Notes: Could benefit from a step-by-step flow with post-import toast + link to created record.

### Issue ID: A6-UX-EVID-07

- Title: Raw UUIDs are shown as prominent page metadata without an affordance
- Area/Module: Inventory + Implementation (detail pages)
- Route/URL: Detail routes across modules
- Preconditions: Logged in as admin.
- Steps to reproduce:
  1. Open a detail view (e.g., Profile).
  2. Observe the header area.
- Expected vs Actual:
  - Expected: If IDs are shown, provide a compact presentation with a copy affordance and/or hide behind "Details".
  - Actual: Some pages show a bare UUID directly under the title, consuming header attention without an obvious action.
- Impact: Visual noise for most users; missed opportunity to support deep-link sharing via a one-click copy.
- Severity: P3
- Heuristic tags (1-3): Visual Hierarchy, Efficiency
- Evidence: `desktop__admin-implementation__profiles-detail__fresh__01.png`, `desktop__admin-implementation__component-definitions-detail__fresh__01.png`, `desktop__admin-implementation__assessment-plans-detail__configured__01.png`
- Recommendation: Replace raw UUID text with a "Copy link" / "Copy ID" control and move the ID into a subtle metadata row.
- Notes: Some modules do show UUID in-card (right column) which is less visually noisy.

## Pattern notes

- Lists are generally table-first with a dense Actions column; however the action set varies heavily (`View`/`JSON`/`Set` vs `View`/`Delete`/`JSON`).
- `Set` is consistently placed as a third action in list rows, but the state indicator is not consistently communicated (SSP shows an `Active` badge; others do not unless explicitly set).
- Detail pages mix navigation patterns (tabs vs links) and mix action patterns (links, small buttons, large colored CTAs, actions-in-card).
- JSON access is present everywhere but label varies (`JSON` vs `JSON View`) and location varies (tab vs row button).

## Appendix: scenarios attempted but not reproduced

- Toast/dialog confirmation for `Set` (none visible in captured states).
- Error/empty states for implementation lists (seed data present); did not force import failure or validation errors in this pass.
- Loading skeleton behavior (pages loaded quickly; no stable loading state captured).
