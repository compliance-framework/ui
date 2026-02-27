# Workflows UX Audit (A5)

Routes covered: `/workflows`, `/workflow-definitions/:id` (tabs), `/workflow-instances` (SSP-gated), `/workflow-instances/:id` (tabs), `/workflow-executions/:id`.

## Findings

### Issue ID: A5-UX-EVID-01

- Title: SSP gating blocks instances without a direct recovery CTA
- Area/Module: Workflows / Workflow Instances
- Route/URL: `/workflow-instances`
- Preconditions: Fresh login; no SSP selected
- Steps to reproduce:
  1. Log in as `admin@example.com`.
  2. Navigate to Workflow Instances.
- Expected vs Actual:
  - Expected: Clear gating message plus a direct action (e.g., button/link) to select an SSP.
  - Actual: Message explains SSP is required but provides no in-context link/button to fix it.
- Impact: Users must discover where SSP is configured; increases drop-off and support burden.
- Severity: P1
- Heuristic tags (1-3): Error Recovery, Navigation/IA, Feedback/Status
- Evidence: `desktop__workflows__workflow-instances__fresh__08.png`
- Recommendation: Add a primary CTA in the gate panel (e.g., “Select SSP”) that navigates to System Security Plans; optionally show the currently selected SSP when configured.
- Notes: The gate styling reads like an error state (red border) rather than a setup requirement.

### Issue ID: A5-UX-EVID-02

- Title: Workflow Definitions list shows a step count that contradicts the definition detail
- Area/Module: Workflows / Workflow Definitions
- Route/URL: `/workflows`, `/workflow-definitions/:id` (Steps tab)
- Preconditions: Any
- Steps to reproduce:
  1. Open Workflow Definitions list.
  2. Open “Demo Workflow” and view Steps tab.
- Expected vs Actual:
  - Expected: Step count in the list matches the definition’s configured steps.
  - Actual: List shows `Steps = 0` while definition shows `Steps (1)` and displays a step.
- Impact: Undermines trust in list summaries; users may assume a definition is incomplete.
- Severity: P1
- Heuristic tags (1-3): Consistency/Standards, Feedback/Status
- Evidence: `desktop__workflows__workflows__fresh__01.png`, `desktop__workflows__workflow-definition-steps__fresh__05.png`
- Recommendation: Ensure list aggregates refresh correctly; consider showing a status badge (Draft/Active) to clarify readiness.
- Notes: The list also includes a Status column but the row is blank.

### Issue ID: A5-UX-EVID-03

- Title: Status fields are missing/blank in list views, reducing scannability
- Area/Module: Workflows / Lists
- Route/URL: `/workflows`, `/workflow-instances`
- Preconditions: SSP selected for instances
- Steps to reproduce:
  1. Open Workflow Definitions list.
  2. Open Workflow Instances list.
- Expected vs Actual:
  - Expected: Status columns show clear badges/text (e.g., Active/Inactive, Draft/Published).
  - Actual: Status columns appear empty, despite instance detail showing an “active” badge.
- Impact: Users can’t quickly assess readiness/health; actions like execute/deactivate feel riskier.
- Severity: P2
- Heuristic tags (1-3): Visual Hierarchy, Feedback/Status, Consistency/Standards
- Evidence: `desktop__workflows__workflows__fresh__01.png`, `desktop__workflows__workflow-instances__ssp__11.png`, `desktop__workflows__workflow-instance-detail__ssp__12.png`
- Recommendation: Populate Status consistently across lists and detail; align wording/casing between badge + table.
- Notes: In `/workflow-instances`, “Execute” is disabled on the row with no explanation.

### Issue ID: A5-UX-EVID-04

- Title: Execute affordances are inconsistent and lack explanation when disabled
- Area/Module: Workflows / Execution
- Route/URL: `/workflow-instances`, `/workflow-instances/:id`, `/workflow-executions/:id`
- Preconditions: SSP selected
- Steps to reproduce:
  1. Open `/workflow-instances` and note the disabled “Execute” action.
  2. Open the same instance and click “Execute Now”.
- Expected vs Actual:
  - Expected: Either execute is available consistently (or disabled consistently) with an explicit reason/requirements.
  - Actual: List “Execute” is disabled with no hint, while detail provides “Execute Now” and a confirmation dialog.
- Impact: Users can’t predict where to execute from; increases confusion and misclicks.
- Severity: P2
- Heuristic tags (1-3): Consistency/Standards, Feedback/Status, Efficiency
- Evidence: `desktop__workflows__workflow-instances__ssp__11.png`, `desktop__workflows__workflow-instance-detail__ssp__12.png`, `desktop__workflows__execute-now-dialog__ssp__18.png`
- Recommendation: Add tooltip/inline helper for disabled execute (e.g., “Assign roles first” / “Inactive instance”); unify execute entry point(s).
- Notes: The execute confirmation dialog is clear but could include a link to the new execution after start.

### Issue ID: A5-UX-EVID-05

- Title: Create Definition dialog lacks a visible field label for the required name
- Area/Module: Workflows / Create dialogs
- Route/URL: `/workflows` (New Definition)
- Preconditions: Any
- Steps to reproduce:
  1. Click “New Definition”.
  2. Click “Create Definition” without entering a name.
- Expected vs Actual:
  - Expected: The required field has a persistent label (e.g., “Name \*”) plus validation message.
  - Actual: The name input appears without a visible label; placeholder text (“Enter workflow name”) carries the meaning.
- Impact: Reduced clarity and accessibility; placeholder-as-label disappears on input and is harder to scan.
- Severity: P2
- Heuristic tags (1-3): A11y, Content/Copy, Error Prevention
- Evidence: `desktop__workflows__new-definition-dialog__fresh__02.png`, `desktop__workflows__new-definition-validation__fresh__03.png`
- Recommendation: Add a visible “Name \*” label consistent with other fields; keep placeholder optional; standardize validation copy across dialogs.
- Notes: Validation copy here is “Name is required”, while the instance dialog uses “Please select a workflow definition”.

### Issue ID: A5-UX-EVID-06

- Title: Execution status formatting and metrics look internally-sourced and inconsistent
- Area/Module: Workflows / Execution detail
- Route/URL: `/workflow-executions/:id`
- Preconditions: Any execution exists
- Steps to reproduce:
  1. Open an execution detail page.
- Expected vs Actual:
  - Expected: Human-readable status (“In progress”) and coherent metrics (totals align with step cards).
  - Actual: Status badge shows `in_progress`; “Started: -” and multiple duration fields show “-”; totals appear inconsistent (e.g., “Total Steps 0” in metrics while step summary shows 1).
- Impact: Reduces confidence in the execution view; users may not trust progress/health indicators.
- Severity: P1
- Heuristic tags (1-3): Feedback/Status, Consistency/Standards, Content/Copy
- Evidence: `desktop__workflows__workflow-execution-detail__ssp__15.png`
- Recommendation: Map statuses to user-facing labels; when data is unknown, explain why (e.g., “Not started yet”); ensure totals match the actual step list.
- Notes: The progress legend and cards are helpful, but the top-line status + metrics are the first thing users read.

### Issue ID: A5-UX-EVID-07

- Title: Permission error explains “why” but doesn’t provide a path to resolve
- Area/Module: Workflows / Execution step details
- Route/URL: `/workflow-executions/:id` (View Details)
- Preconditions: Execution step assigned to a role the current user doesn’t hold
- Steps to reproduce:
  1. Open an execution.
  2. Click “View Details” on a step.
- Expected vs Actual:
  - Expected: Error explains missing role and offers next actions (e.g., link to Role Assignments, “Request access”, or show who can assign).
  - Actual: Banner states “No Permission” and mentions the required role (“owner”), but leaves users without an immediate remediation path.
- Impact: Users get stuck mid-workflow; increases back-and-forth and slows execution.
- Severity: P1
- Heuristic tags (1-3): Error Recovery, Control/Freedom, Feedback/Status
- Evidence: `desktop__workflows__workflow-execution-details-dialog__ssp__16.png`, `desktop__workflows__workflow-instance-role-assignments__ssp__13.png`
- Recommendation: Add a contextual CTA (“Go to Role Assignments”) and/or show current assignees for the required role.
- Notes: Seeing this as an admin is especially surprising; consider clearer messaging about how permissions are derived.

### Issue ID: A5-UX-EVID-08

- Title: Workflow Instance Overview tab is empty and doesn’t orient the user
- Area/Module: Workflows / Instance editor
- Route/URL: `/workflow-instances/:id` (Overview tab)
- Preconditions: SSP selected
- Steps to reproduce:
  1. Open a workflow instance.
  2. Stay on the Overview tab.
- Expected vs Actual:
  - Expected: Overview shows key at-a-glance info (definition link, status, last/next execution, ownership, alerts).
  - Actual: Overview tab shows no content beyond the header and tabs.
- Impact: Users have to hunt across tabs to understand what’s configured and what to do next.
- Severity: P2
- Heuristic tags (1-3): Visual Hierarchy, Efficiency, Feedback/Status
- Evidence: `desktop__workflows__workflow-instance-detail__ssp__12.png`
- Recommendation: Populate Overview with a compact summary and primary next actions; mirror key fields shown in list view.
- Notes: Role Assignments provides a good empty state + context; Overview could follow the same pattern.

## Pattern notes

- Tabs are generally consistent in placement and style, but the “Overview” tab meaning varies (definition overview has implicit context; instance overview is empty).
- JSON tabs on definition/instance share Copy/Download affordances (good consistency); consider aligning naming and iconography across all “JSON” views.
- List/table views include helpful filters, but truncation (e.g., “Filter by stat...”) and empty status cells reduce scan value.
- Dialogs use similar structure (title, content, Cancel/primary), but required-field labeling and validation copy are inconsistent.
- Status indicators vary in casing and format (badge “active” vs `in_progress`), which reads like internal values leaking into the UI.

## Appendix: scenarios attempted but not reproduced

- Did not start a new execution from the confirmation dialog to avoid creating additional records.
- Did not delete definitions/instances.
