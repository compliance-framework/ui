# System + Inventory UX Audit (Agent 3)

Routes covered: `/system` (tabs: overview/users/components/authorizations), `/inventory`

Viewport: 1440x900 (desktop)

## Findings

### A3-UX-EVID-01

- Title: System area blocks work until SSP is selected; guidance is easy to miss on tabbed pages
- Area/Module: System
- Route/URL: `/system`, `/system/users`, `/system/components`, `/system/authorizations`
- Preconditions: Fresh login; no System Security Plan (SSP) selected
- Steps to reproduce:
  1. Log in.
  2. Visit `/system`.
  3. Switch between System tabs (Users/Components/Leveraged Authorizations).
- Expected vs Actual:
  - Expected: Clear, prominent prerequisite messaging with a primary next-step action.
  - Actual: A blocking alert appears in the content area; the only next step is a text link to the SSP list.
- Impact: First-run users hit a hard stop; the “why/what to do next” is present but not strongly action-oriented.
- Severity: P1
- Heuristic tags (1-3): Feedback/Status, Navigation/IA, Error Prevention
- Evidence:
  - `desktop__system-inventory__system-overview__fresh-no-ssp__01.png`
  - `desktop__system-inventory__system-users__fresh-no-ssp__01.png`
  - `desktop__system-inventory__system-components__fresh-no-ssp__01.png`
  - `desktop__system-inventory__system-authorizations__fresh-no-ssp__01.png`
- Recommendation:
  - Make the prerequisite state feel like a guided setup: a primary button (e.g., “Select an SSP”), brief explanation of what an SSP unlocks, and a persistent indicator of the currently selected SSP once configured.
- Notes: Gating copy observed includes “System Security Plan not selected” and a link labeled “SSP Page”.

### A3-UX-EVID-02

- Title: Inventory “Sources” checkboxes appear non-functional (don’t affect the list)
- Area/Module: Inventory
- Route/URL: `/inventory`
- Preconditions: Logged in (SSP state does not change this behavior)
- Steps to reproduce:
  1. Visit `/inventory`.
  2. Uncheck all Source checkboxes.
  3. Click Refresh.
- Expected vs Actual:
  - Expected: The list updates to match selected Sources (or the UI clarifies that Sources are informational only).
  - Actual: The list still shows items from unchecked Sources, creating a “filters not applied” impression.
- Impact: Users can’t trust filtering controls; increases time spent validating results and reduces confidence.
- Severity: P2
- Heuristic tags (1-3): Consistency/Standards, Feedback/Status, Error Prevention
- Evidence:
  - `desktop__system-inventory__inventory-index__fresh__01.png`
  - `desktop__system-inventory__inventory-index__fresh-filters-unchecked-refresh__01.png`
  - `desktop__system-inventory__inventory-index__fresh-filter-firewall-ssp-unchecked__01.png`
- Recommendation:
  - Either wire Sources to actually filter, or reframe as read-only “Included sources” with clearer labeling and remove checkbox affordance.

### A3-UX-EVID-03

- Title: Inventory item rows have unclear “view details” affordance (unlabeled row action buttons)
- Area/Module: Inventory
- Route/URL: `/inventory`
- Preconditions: Inventory list has items
- Steps to reproduce:
  1. Visit `/inventory`.
  2. Click the unlabeled button aligned with a row.
- Expected vs Actual:
  - Expected: Clear row action (e.g., “View”, chevron with tooltip, or row click) that opens a detail view/drawer.
  - Actual: The row includes an unlabeled button; clicking did not produce a visible state change in this run.
- Impact: Discoverability and accessibility risk; users may not realize items are interactive or how to inspect an item.
- Severity: P2
- Heuristic tags (1-3): Control/Freedom, A11y, Visual Hierarchy
- Evidence:
  - `desktop__system-inventory__inventory-index__fresh__01.png`
  - `desktop__system-inventory__inventory-item__fresh__01.png`
- Recommendation:
  - Make the interaction explicit: row click with hover state + “View details” affordance; ensure the action is labeled for screen readers.

### A3-UX-EVID-04

- Title: System Overview diagrams section has repeated “Add Diagram” CTAs that are hard to distinguish
- Area/Module: System
- Route/URL: `/system`
- Preconditions: SSP selected
- Steps to reproduce:
  1. Select an SSP.
  2. Visit `/system`.
  3. Scroll to the diagrams area.
- Expected vs Actual:
  - Expected: Distinct actions per diagram type (or a single “Manage diagrams” entry point).
  - Actual: Multiple identical “Add Diagram” buttons appear next to different diagram headings; “Delete Diagram” also appears without clear scoping.
- Impact: Users may add/delete the wrong diagram type; increases hesitation and errors.
- Severity: P3
- Heuristic tags (1-3): Error Prevention, Visual Hierarchy, Consistency/Standards
- Evidence:
  - `desktop__system-inventory__system-overview__ssp-set__01.png`
- Recommendation:
  - Label CTAs with their target (e.g., “Add Network Architecture diagram”), and scope destructive actions to the diagram instance with confirmation/context.

### A3-UX-EVID-05

- Title: Create User dialog contains duplicated/ambiguous field groups (Title/Short Name/Description repeated)
- Area/Module: System Users
- Route/URL: `/system/users`
- Preconditions: SSP selected
- Steps to reproduce:
  1. Visit `/system/users`.
  2. Click “Create User”.
- Expected vs Actual:
  - Expected: A single, clearly grouped set of user fields, with optional sections labeled in plain language.
  - Actual: Required fields appear duplicated and interleaved with a “Role IDs” section that repeats Title/Short Name/Description, making it unclear what is being created.
- Impact: High form confusion; higher chance of wrong data entry or abandonment.
- Severity: P1
- Heuristic tags (1-3): Content/Copy, Visual Hierarchy, Error Prevention
- Evidence:
  - `desktop__system-inventory__system-users-create__ssp-set__01.png`
  - `desktop__system-inventory__system-users-create__validation-errors__01.png`
- Recommendation:
  - Separate “User” vs “Role/Privilege” concepts into distinct sections with helper text; avoid repeating labels; consider guided add-more patterns for roles/privileges.

### A3-UX-EVID-06

- Title: Create System Component dialog repeats “Remarks” and mixes required/optional fields without hierarchy
- Area/Module: System Components
- Route/URL: `/system/components`
- Preconditions: SSP selected
- Steps to reproduce:
  1. Visit `/system/components`.
  2. Click “Create Component”.
- Expected vs Actual:
  - Expected: Clear field hierarchy and unambiguous labels (one meaning per label).
  - Actual: “Remarks” appears twice and required fields are numerous without progressive disclosure; increases cognitive load.
- Impact: Slower data entry, higher error likelihood.
- Severity: P2
- Heuristic tags (1-3): Visual Hierarchy, Consistency/Standards, Efficiency
- Evidence:
  - `desktop__system-inventory__system-components-create__ssp-set__01.png`
  - `desktop__system-inventory__system-components-create__validation-errors__01.png`
- Recommendation:
  - Clarify the two “Remarks” fields (rename/scope), group required basics at top, and move advanced fields (protocols, extra remarks) behind “Add details”.

### A3-UX-EVID-07

- Title: Create Leveraged Authorization requires entering a “Party UUID”, which is hard to obtain from the UI
- Area/Module: System Authorizations
- Route/URL: `/system/authorizations`
- Preconditions: SSP selected
- Steps to reproduce:
  1. Visit `/system/authorizations`.
  2. Click “Create Authorization”.
- Expected vs Actual:
  - Expected: Ability to search/select the authorizing party from a list, with optional advanced identifiers.
  - Actual: The form asks for a raw “Party UUID” in a required textbox.
- Impact: Blocks non-technical users; increases copy/paste errors.
- Severity: P1
- Heuristic tags (1-3): Error Prevention, Efficiency, Content/Copy
- Evidence:
  - `desktop__system-inventory__system-authorizations__ssp-set__01.png`
  - `desktop__system-inventory__system-authorizations-create__ssp-set__01.png`
- Recommendation:
  - Replace UUID entry with a party picker (search + select), and show the UUID as secondary read-only detail if needed.

## Pattern notes

- Tabs: System uses a tab bar with link-backed tabs; the gated state still renders the module chrome but replaces content with an alert.
- Dialogs: Create flows open modal dialogs with many fields and repeated labels; required markers exist but the form hierarchy is hard to scan.
- Empty states: Leveraged Authorizations has a clear empty message plus a single CTA; this pattern is stronger than other areas.
- Inventory: Mixed filter patterns (“Sources” checkbox group + “Item Type” dropdown) create confusion when some controls don’t affect results.

## Appendix: scenarios attempted but not reproduced

- Inventory detail view: Clicking row-level unlabeled buttons did not open a visible detail view/drawer in this run (may require a different click target or keyboard interaction).
