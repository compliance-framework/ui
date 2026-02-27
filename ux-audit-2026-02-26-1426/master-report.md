# Master UX Report (Consolidated)

Run id: ux-audit-2026-02-26-1426

Artifacts:

- Application map + screenshot index: `ux-work/ux-audit-2026-02-26-1426/atlas.md`
- Area reports:
  - `ux-work/ux-audit-2026-02-26-1426/reports/global-prereq-patterns.md`
  - `ux-work/ux-audit-2026-02-26-1426/reports/dashboards-evidence.md`
  - `ux-work/ux-audit-2026-02-26-1426/reports/system-inventory.md`
  - `ux-work/ux-audit-2026-02-26-1426/reports/controls.md`
  - `ux-work/ux-audit-2026-02-26-1426/reports/workflows.md`
  - `ux-work/ux-audit-2026-02-26-1426/reports/admin-implementation.md`

Non-negotiable known pain points (confirmed in this run):

- SSP activation/selection prerequisite blocks multiple modules until set
- Inconsistent layouts/patterns across modules (including popups/dialogs/drawers and feedback/toasts)

## Top Issues (Prioritized)

### P1 (serious)

1. SSP prerequisite gating is inconsistent and often lacks a clear recovery CTA

- Symptoms: “System Security Plan not selected” gates appear across System/Controls/Workflow Instances, but next-step affordances vary (sometimes only an inline “SSP Page” link; sometimes no CTA).
- Impact: first-run users hit dead ends; prerequisite model is hard to learn.
- Evidence:
  - `desktop__global-prereq-patterns__system__fresh__01.png`
  - `desktop__global-prereq-patterns__controls__fresh__01.png`
  - `desktop__workflows__workflow-instances__fresh__08.png`

2. Controls has a second prerequisite gate after SSP selection (no linked profile) with weak remediation

- Symptoms: after “doing the right thing” (setting an SSP), Controls can still be blocked with a separate message that routes users to an unrelated-feeling destination.
- Impact: users assume Controls is broken; unclear how to resolve.
- Evidence:
  - `desktop__controls__controls__configured-no-profile__22.png`
  - `desktop__controls__system-security-plans__configured-ssp-switch__03.png`

3. “Set active” flows (SSP/AP/AR/POA&M) provide subtle feedback and don’t expose “unset/change” clearly

- Symptoms: selection is shown via a small “Active” pill; the action label stays “Set”; no confirmation feedback observed.
- Impact: users re-click, miss the state change, or lose track of current scope.
- Evidence:
  - `desktop__global-prereq-patterns__system-security-plans__configured__01.png`
  - `desktop__admin-implementation__system-security-plans__configured__01.png`
  - `desktop__global-prereq-patterns__assessment-plans__configured__01.png`
  - `desktop__global-prereq-patterns__assessment-results__configured__01.png`
  - `desktop__global-prereq-patterns__poam__configured__01.png`

4. Active SSP context is not consistently visible across the app after setting

- Symptoms: System shows the active SSP prominently; other modules don’t reliably surface current scope.
- Impact: users can’t confidently tell which plan their work is applied to.
- Evidence:
  - `desktop__global-prereq-patterns__system__configured__01.png`
  - `desktop__global-prereq-patterns__controls__configured__01.png`
  - `desktop__global-prereq-patterns__workflow-instances__configured__01.png`
  - `desktop__dashboards-evidence__dashboards__configured__01.png`
  - `desktop__dashboards-evidence__evidence__configured__01.png`

5. Destructive actions are over-emphasized in some lists (Dashboards, Catalogs)

- Symptoms: large, high-salience “Delete” appears as a primary action in contexts where other modules treat destructive actions as secondary.
- Impact: higher risk of accidental deletion; users avoid exploring.
- Evidence:
  - `desktop__dashboards-evidence__dashboards__fresh__01.png`
  - `desktop__admin-implementation__catalogs__configured__01.png`

6. Validation and required-field feedback is inconsistent, sometimes “silent”

- Symptoms: Evidence create and Dashboard create flows don’t clearly mark required fields; submission can fail without obvious inline errors.
- Impact: users get stuck, retry blindly, or abandon.
- Evidence:
  - `desktop__dashboards-evidence__evidence-create__fresh__01.png`
  - `desktop__dashboards-evidence__dashboards-create__fresh__01.png`
  - `desktop__workflows__new-definition-validation__fresh__03.png`
  - `desktop__system-inventory__system-users-create__validation-errors__01.png`

7. Workflows status/metrics presentation appears inconsistent and sometimes “leaks” non-user-friendly values

- Symptoms: blank Status columns in lists; execution detail shows raw-ish status formatting and conflicting totals.
- Impact: reduced trust and slower decision-making.
- Evidence:
  - `desktop__workflows__workflows__fresh__01.png`
  - `desktop__workflows__workflow-instances__ssp__11.png`
  - `desktop__workflows__workflow-execution-detail__ssp__15.png`

8. System create dialogs include ambiguous or hard-to-obtain inputs (e.g., raw IDs)

- Symptoms: forms contain repeated/ambiguous label sets and require users to provide identifiers they cannot easily select from the UI.
- Impact: blocks non-technical users; increases errors.
- Evidence:
  - `desktop__system-inventory__system-users-create__ssp-set__01.png`
  - `desktop__system-inventory__system-components-create__ssp-set__01.png`
  - `desktop__system-inventory__system-authorizations-create__ssp-set__01.png`

### P2 (moderate)

9. Inventory filtering and row actions reduce trust and discoverability

- Symptoms: “Sources” checkboxes appear not to affect results; row-level “details” affordance is unclear.
- Impact: users can’t trust filters; exploration is slower.
- Evidence:
  - `desktop__system-inventory__inventory-index__fresh-filters-unchecked-refresh__01.png`
  - `desktop__system-inventory__inventory-item__fresh__01.png`

10. Evidence list density suffers from chip-heavy rows; search hinting is hard to learn

- Symptoms: complex placeholder syntax and many long chips expand row height.
- Impact: slower scanning; unclear how to search effectively.
- Evidence:
  - `desktop__dashboards-evidence__evidence__fresh__01.png`

## Key Themes

- Prerequisites + scoping: SSP (and other “Set” selections) behave like global context but aren’t communicated as a consistent, reversible scope.
- Consistency/standards: navigation tabs, list headers/actions, and primary action placement vary heavily across modules.
- Feedback/status: many actions don’t confirm success/failure clearly (including missing/blank statuses and “silent” validation).
- Information hierarchy: dense forms and repeated labels increase cognitive load; icon-only actions reduce clarity.
- Empty/loading states: multiple panels read as “blank” rather than clearly “loading” or “no data”.

## SSP Prerequisite UX (Before/After)

### What users see (fresh / no SSP selected)

- System blocks inside the module chrome with an alert and minimal next-step guidance.
- Controls blocks similarly, relying on jargon (“SSP”) and a low-affordance link.
- Workflow Instances blocks without a direct in-context CTA.

Evidence:

- System gated: `desktop__global-prereq-patterns__system__fresh__01.png`, `desktop__system-inventory__system-overview__fresh-no-ssp__01.png`
- Controls gated: `desktop__global-prereq-patterns__controls__fresh__01.png`, `desktop__controls__controls__fresh-no-ssp__01.png`
- Workflow Instances gated: `desktop__workflows__workflow-instances__fresh__08.png`, `desktop__global-prereq-patterns__workflow-instances__fresh__01.png`

### What changes after SSP is set (configured)

- System becomes a functional, tabbed workspace and surfaces active SSP context prominently.
- Controls may unlock, but can present a second “no linked profile” gate.
- Workflow Instances unlocks list + instance detail/editor.

Evidence:

- SSP list active indicator: `desktop__global-prereq-patterns__system-security-plans__configured__01.png`, `desktop__admin-implementation__system-security-plans__configured__01.png`
- System unlocked: `desktop__global-prereq-patterns__system__configured__01.png`, `desktop__system-inventory__system-overview__ssp-set__01.png`
- Controls unlocked: `desktop__controls__controls__configured__01.png`
- Controls secondary gate: `desktop__controls__controls__configured-no-profile__22.png`
- Workflow Instances unlocked: `desktop__workflows__workflow-instances__ssp__11.png`, `desktop__workflows__workflow-instance-detail__ssp__12.png`

### Recommended UX improvements (gating + scope)

- Standardize the gate panel across all SSP-gated modules:
  - Plain-language title (avoid acronyms as the only noun)
  - 1–2 sentences explaining what setting an SSP enables
  - Primary CTA: “Select a System Security Plan”
  - Secondary: “Learn what this means” (short inline explainer)
  - Return the user to the original page after selection
- Add a persistent “Active SSP” scope indicator in the global shell with a one-click “Change” action.
- Make “Set” lists stateful and obvious:
  - Selected row styling + action label changes (e.g., “Active” / “Make active”)
  - Optional confirmation feedback that is consistent across modules
- For Controls’ second gate (no linked profile), show:
  - The selected SSP name
  - A direct corrective CTA (“Link a profile for this SSP” / “Choose a different SSP”) instead of a generic “System Page” detour

## UI Pattern Inconsistency Catalog (Representative)

Tabs / section navigation

- System uses clear top tabs: `desktop__global-prereq-patterns__system__configured__01.png`
- Implementation editors vary widely in tab styling, wrapping, and labeling (“JSON” vs “JSON View”):
  - `desktop__admin-implementation__system-security-plans-detail__configured__01.png`
  - `desktop__admin-implementation__plan-of-action-and-milestones-detail__configured__01.png`

List headers, CTAs, and action density

- Create CTAs appear in different locations and with different labels across lists: `desktop__admin-implementation__assessment-plans__fresh__01.png`, `desktop__admin-implementation__catalogs__configured__01.png`
- “Set” adds to action density with subtle state cues: `desktop__global-prereq-patterns__assessment-results__fresh__01.png`

Dialogs / overlays / drawers

- Modal create dialog with inconsistent labeling/validation patterns (placeholders-as-labels): `desktop__workflows__new-definition-dialog__fresh__02.png`
- System overlay pattern (diagrams): `desktop__global-prereq-patterns__system__configured__02.png`
- Controls implies a details surface, but the “eye” action outcome is unclear/unreliable: `desktop__controls__controls__configured-control-action__21.png`, `desktop__controls__controls__configured-eye-no-details__17.png`

Toasts / confirmations

- “Set active” actions did not show confirmation toasts in observed flows; success is conveyed only by subtle inline state: `desktop__global-prereq-patterns__system-security-plans__configured__01.png`

Empty/loading/error states

- Evidence charts/panels read as blank without state messaging: `desktop__dashboards-evidence__home__fresh__01.png`
- Evidence Media panel lacks a clear empty state: `desktop__dashboards-evidence__evidence-id__fresh__01.png`
- Controls search empty state copy is misleading (“No available options”): `desktop__controls__controls__configured-empty-search__08.png`

## Quick Wins vs Overhaul

Quick wins (high leverage, low/medium effort)

- Standardize SSP gate panel + add a consistent primary CTA everywhere it appears.
- Add global “Active SSP” indicator + quick change.
- Make “Set” state obvious (stateful button/row styling) + add optional confirmation feedback.
- De-emphasize Delete (move to overflow + confirm), especially in Dashboards and Catalogs.
- Fix/clarify Inventory “Sources” checkboxes (either functional filters or relabel as informational).
- Add required-field indicators + inline validation messages on create/edit flows (Evidence, Dashboards, Workflows dialogs).
- Normalize status text/badges and ensure list summaries match detail.

Overhaul (strategic)

- Define a shared page template system for:
  - list pages (header + filters + primary CTA + table)
  - detail editors (consistent tab component + sticky primary actions)
  - dialogs (labels, required markers, validation copy, button ordering)
- Make “scope” (active SSP and other active selections) a first-class concept with consistent visibility, change control, and auditability.

## Appendix: Edge-case Scenarios to Validate (Not Reproduced)

Scenario ID: SCN-01

- Area/Route: SSP/AP/AR/POA&M “Set” lists
- Preconditions: Logged in
- Trigger steps attempted: Clicked “Set” on multiple lists; scanned for success notifications
- Expected user-visible behavior: Clear confirmation that the active context changed (toast/inline banner) and unambiguous selected state
- Why this matters for UX: Prevents repeated clicks and reduces risk of working in the wrong scope
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Try in slower network conditions and after switching between multiple records

Scenario ID: SCN-02

- Area/Route: Dashboards detail view (`/dashboards/:id`)
- Preconditions: Logged in; dashboards exist
- Trigger steps attempted: Looked for card click or “View” affordance from the list
- Expected user-visible behavior: A clear “View” action and a consistent path to dashboard details
- Why this matters for UX: Supports basic navigation and reduces accidental deletion risk
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Create a dashboard, then verify list affordances for viewing/editing

Scenario ID: SCN-03

- Area/Route: Inventory item detail
- Preconditions: Logged in; inventory items present
- Trigger steps attempted: Clicked row-level unlabeled action buttons
- Expected user-visible behavior: A visible details view/drawer/page with item fields
- Why this matters for UX: Enables inspection and builds trust in inventory data
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Test row click, chevron click, and keyboard activation on the row action

Scenario ID: SCN-04

- Area/Route: Controls control-details surface
- Preconditions: Logged in; Controls accessible
- Trigger steps attempted: Clicked control titles and the “eye” icon across expanded groups
- Expected user-visible behavior: Predictable details surface (drawer/modal/page) with clear focus management
- Why this matters for UX: Core “understand a control” workflow depends on it
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Verify with multiple controls and ensure icon actions always map to visible outcomes

Scenario ID: SCN-05

- Area/Route: Error states on Evidence/Dashboards pages
- Preconditions: Logged in
- Trigger steps attempted: Normal navigation; did not induce server/network errors
- Expected user-visible behavior: Clear inline error messaging with retry actions
- Why this matters for UX: Users need recovery paths when data cannot load
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Test with network interruption and forced API failure conditions (user-visible behavior only)

Scenario ID: SCN-06

- Area/Route: Admin Import
- Preconditions: Logged in
- Trigger steps attempted: Observed disabled Import/Clear controls without selecting a file
- Expected user-visible behavior: Disabled states explained; import workflow clearly differentiated or unified
- Why this matters for UX: Prevents incorrect imports and reduces “page is broken” perceptions
- Validation status: Not reproduced in current run
- Suggested follow-up test method: Try valid and invalid files and verify post-import confirmation + next-step guidance
