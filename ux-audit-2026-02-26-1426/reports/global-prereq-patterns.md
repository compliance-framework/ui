# Global Prerequisite Patterns (SSP / AP / AR / POA&M)

Scope: SSP "Set" flow + gating messages across modules; other "Set" flows (Assessment Plans/Results, POA&M); pattern catalog for layout/tabs/dialogs/toasts/drawers.

## Findings

### Issue ID: A1-UX-EVID-01

- Title: SSP gating copy and next-step affordance is inconsistent across modules
- Area/Module: Global prerequisite gating (System, Controls, Workflow Instances)
- Route/URL: `/system`, `/controls`, `/workflow-instances`
- Preconditions: Logged in; no System Security Plan (SSP) selected
- Steps to reproduce:
  1. Navigate to `/system`.
  2. Navigate to `/controls`.
  3. Navigate to `/workflow-instances`.
- Expected vs Actual:
  - Expected: A consistent blocking pattern that explains the prerequisite and provides a clear, direct next step (e.g., a primary action to select/set an SSP).
  - Actual: System/Controls show a blocking message with an inline link labeled "SSP Page"; Workflow Instances shows different wording and does not present a direct navigation/action to select an SSP.
- Impact: Users hit dead-ends or spend time hunting the correct place to resolve the prerequisite; inconsistent messaging makes the prerequisite model harder to learn.
- Severity: P1
- Heuristic tags (1-3): Consistency/Standards, Error Recovery, Content/Copy
- Evidence: `desktop__global-prereq-patterns__system__fresh__01.png`, `desktop__global-prereq-patterns__controls__fresh__01.png`, `desktop__global-prereq-patterns__workflow-instances__fresh__01.png`
- Recommendation:
  - Standardize the gating template (title, explanation, and a primary CTA).
  - Use a consistent primary action (e.g., "Select System Security Plan") that routes directly to the SSP list and returns the user to their original destination after setting.
- Notes: Workflow Instances copy is more task-specific ("managing instances") but lacks the navigational affordance present elsewhere.

### Issue ID: A1-UX-EVID-02

- Title: "Set" selection flows provide weak feedback and limited control (no clear selected state / unset)
- Area/Module: Set flows (System Security Plans, Assessment Plans, Assessment Results, POA&M)
- Route/URL: `/system-security-plans`, `/assessment-plans`, `/assessment-results`, `/plan-of-action-and-milestones`
- Preconditions: Logged in
- Steps to reproduce:
  1. Open one of the list pages above.
  2. Click "Set" on any row.
  3. Observe how the UI indicates selection; try to reverse/clear selection.
- Expected vs Actual:
  - Expected: The selected row has a strong, unambiguous state (e.g., "Selected" row styling + button changes to "Unset"/"Change"), and the action provides immediate feedback.
  - Actual: Selection is indicated only by a small "Active" pill near the title while the row action remains labeled "Set"; clearing selection is not available (only switching by setting a different record).
- Impact: Users may not notice that selection succeeded, may click repeatedly, and may be unsure which object is currently active.
- Severity: P2
- Heuristic tags (1-3): Feedback/Status, Control/Freedom, Consistency/Standards
- Evidence: `desktop__global-prereq-patterns__system-security-plans__fresh__01.png`, `desktop__global-prereq-patterns__system-security-plans__configured__01.png`, `desktop__global-prereq-patterns__assessment-plans__fresh__01.png`, `desktop__global-prereq-patterns__assessment-plans__fresh__02.png`, `desktop__global-prereq-patterns__assessment-plans__fresh__03.png`, `desktop__global-prereq-patterns__assessment-results__fresh__01.png`, `desktop__global-prereq-patterns__assessment-results__fresh__02.png`, `desktop__global-prereq-patterns__poam__fresh__01.png`, `desktop__global-prereq-patterns__poam__fresh__02.png`
- Recommendation:
  - Change the row action to reflect state (e.g., "Set" -> "Active"/"Selected") and provide an explicit "Unset" or "Change" pattern.
  - Consider a single-select control (radio-like) for "active" selection to reduce ambiguity.
  - Add lightweight confirmation feedback (inline + optional toast) that is consistent across all "Set" lists.
- Notes: The "Active" pill is present but visually easy to miss when scanning action-heavy tables.

### Issue ID: A1-UX-EVID-03

- Title: Active SSP context is not consistently visible across modules after setting
- Area/Module: Cross-module context (global header/sidebar + module pages)
- Route/URL: `/system`, `/controls`, `/workflow-instances`, plus list pages
- Preconditions: Logged in; SSP set (e.g., "Continious Compliance Framework System Security Plan")
- Steps to reproduce:
  1. Set an SSP from `/system-security-plans`.
  2. Navigate to `/controls` and `/workflow-instances`.
  3. Compare visibility of the active SSP context across pages.
- Expected vs Actual:
  - Expected: A consistent, global indicator of the active SSP (name + quick change action) is visible in the primary shell (header/sidebar) or at the top of each module.
  - Actual: The System module prominently displays the active SSP name; other modules/pages rely on the SSP list itself to reveal what is active, with no obvious global indicator.
- Impact: Users can lose track of which SSP their actions apply to, increasing the risk of editing the wrong context.
- Severity: P2
- Heuristic tags (1-3): Feedback/Status, Navigation/IA
- Evidence: `desktop__global-prereq-patterns__system__configured__01.png`, `desktop__global-prereq-patterns__controls__configured__01.png`, `desktop__global-prereq-patterns__workflow-instances__configured__01.png`
- Recommendation:
  - Add a persistent global "Active SSP" badge in the header or sidebar with a one-click path to change.
  - Reuse the same indicator pattern consistently across modules.
- Notes: This becomes more critical when multiple SSPs exist (as shown on the SSP list).

## Pattern Notes

- Layout (global shell): Persistent left sidebar navigation + top-right user avatar/menu; page content uses a large page title and centered card/table container.
- Gating (SSP prerequisite): Full-page blocking message with a heading ("System Security Plan not selected") and explanatory copy; sometimes includes an inline navigational link ("SSP Page"), but not consistently across modules.
- Tabs: System module uses top-level tabs (Overview/System Users/System Components/Leveraged Authorizations) that read as navigation and content segmentation.
- Tables + actions: List pages use a table-in-card pattern with an Actions column containing outlined buttons ("View", "JSON", "Set"). Selected state is shown via an "Active" pill.
- Dialog/overlay: System "Add Diagram" opens an overlay with a visible Close affordance.
- Toasts/drawers: No toast notifications or slide-in drawers were observed in these prerequisite/set flows during this pass.

Representative screenshots:

- Gating: `desktop__global-prereq-patterns__system__fresh__01.png`, `desktop__global-prereq-patterns__workflow-instances__fresh__01.png`
- Tabs + module container: `desktop__global-prereq-patterns__system__configured__01.png`
- Overlay: `desktop__global-prereq-patterns__system__configured__02.png`
- "Set" lists: `desktop__global-prereq-patterns__system-security-plans__configured__01.png`, `desktop__global-prereq-patterns__assessment-results__configured__01.png`, `desktop__global-prereq-patterns__poam__configured__01.png`

## Appendix: Scenarios Attempted But Not Reproduced

- Toast confirmation after clicking "Set" (SSP/AP/AR/POA&M): selection changed state via an "Active" pill only; no toast was seen.
- Global blocking dialog/drawer for missing SSP: only full-page inline gating messages were encountered.
