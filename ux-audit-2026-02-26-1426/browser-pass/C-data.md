# Browser UX pass: Group C (data surfaces)

Run: 2026-10-10, local-dev stack (UI :3000, API :8080), headless Chromium at 1440×900 (and 390×844 for mobile), logged in as admin@example.com.
Scope: Evidence, Inventory, Risk register, POA&M, Compliance Map / Control Links, Evidence Filters, Workflows, My Tasks.
Screenshots: `thread-storage/thr_yy6iaqjxfk/browser-pass/shots/C-*.jpg` (42 files).

Context:

- Every route in this group renders in the **V1 shell**, except `/dashboards` ("Evidence Filters"), which is V2. There are no V1_in_V2_shell routes here.
- **Workflows have no V2 code at all.** There is no `views/workflows-v2`, and no v2 component with "workflow" in its name. The Pencil frames `xoqKd` and `ZYWqx` (commit dbaa8a1) exist only in `new-design.pen`, and route-inventory lists Workflows as `not_started`.
- Inventory, the POA&M list, `/poam-items` and `/my-tasks` have no sidebar entry. On main, Inventory and POA&M are commented out of the nav. My Tasks is reachable only from the user menu.
- Test data I created and deleted: one risk, "UXPASS risk" (FedRAMP SSP, deleted through the Risk Register), and one blank POA&M item (see C-05, deleted through its Delete button). The filter-create attempt returned 400, so nothing was saved. No seeded records were changed.
- Dark mode could not be tested: the theme is forced to light (see C-13).
- Run note: my helper scripts were in the shared `$TMPDIR/bp/`, which another agent also wrote to at 12:48. Every run's screenshots came from my own session's temp dir, so the runs went to my session. To be safe, findings that depend on browser state (active SSP, theme, the SSP select default, the create-risk dialog default) were re-checked against the code. One unexplained blank-page screenshot was left out of the findings.

## 1. Coverage

| Route                                                                              | Shell | States checked                                                                                                                | #findings |
| ---------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- | --------: |
| `/evidence`                                                                        | V1    | no SSP, FedRAMP SSP, label search with results/none/invalid, subject filter, sort, share, CSV export, menu, mobile            |         5 |
| `/evidence/:id` (tabs Overview/Metadata/Risks/Media/Signature/History, View Tasks) | V1    | populated, bogus id (404), Create Risk dialog with/without active SSP                                                         |         3 |
| `/evidence/history/:uuid`                                                          | V1    | populated, bogus uuid (empty)                                                                                                 |         1 |
| `/evidence/create`, `/evidence/:id/update`                                         | V1    | empty submit, SSP narrowing select                                                                                            |         1 |
| Policy evaluation (playback)                                                       | V1    | **unverified**: none of the 60 seeded evidence streams has the policy-bundle-digest prop                                      |         0 |
| `/dashboards` (nav "Evidence Filters")                                             | V2    | FedRAMP SSP                                                                                                                   |         1 |
| `/dashboards/create` (from Evidence "Save")                                        | V1    | empty submit                                                                                                                  |         1 |
| `/inventory`                                                                       | V1    | sources on/off/all-off, AP/AR, item type, row expand, no SSP, mobile                                                          |         3 |
| `/risks`                                                                           | V1    | no SSP gate, FedRAMP empty, create UXPASS risk, likelihood filter, delete                                                     |         3 |
| `/risks/:riskId` (tabs)                                                            | V1    | owning SSP active, other SSP active, no SSP, bogus id                                                                         |         2 |
| `/admin/risks`                                                                     | V1    | FedRAMP SSP (same panel as `/risks`, plus a score-trend chart and an SSP selector)                                            |         0 |
| `/plan-of-action-and-milestones`                                                   | V1    | list, bogus id                                                                                                                |         1 |
| `/plan-of-action-and-milestones/:id` (Overview, POAM Items, Risks, Observations)   | V1    | populated, create POA&M item (validation), delete                                                                             |         3 |
| `/plan-of-action-and-milestones/create`                                            | V1    | empty submit                                                                                                                  |         1 |
| `/poam-items`                                                                      | V1    | empty                                                                                                                         |         2 |
| `/lineage`, `/lineage/graph`                                                       | V1    | FedRAMP SSP                                                                                                                   |         1 |
| `/control-links`, `/control-links/new`                                             | V1    | list; empty submit in single-control and whole-catalog modes                                                                  |         0 |
| `/workflows`                                                                       | V1    | list, New Definition validation                                                                                               |         2 |
| `/workflow-definitions/:id` (Overview/Steps/Controls/JSON)                         | V1    | populated                                                                                                                     |         1 |
| `/workflow-instances`                                                              | V1    | no SSP gate, FedRAMP list, New Instance validation                                                                            |         3 |
| `/workflow-instances/:id` (Overview/Roles/Executions/JSON)                         | V1    | populated, no executions                                                                                                      |         1 |
| `/workflow-executions/:id`                                                         | V1    | bogus id only. **Unverified** with real data: no executions are seeded, and I did not execute to avoid records I can't delete |         1 |
| `/my-tasks`                                                                        | V1    | empty                                                                                                                         |         0 |
| Workflow definition import                                                         | n/a   | no import UI exists on `/workflows`                                                                                           |         0 |

## 2. Findings

### C-01 [P1] [broken] Subject picker's SSP select on evidence create/re-submit is broken: it shows the wrong SSP and never filters

- URL: `/evidence/create` and `/evidence/:id/update` (Subject section)
- Steps: open the page with FedRAMP active, look at the SSP select next to "Search components, parties, users...", open it, then pick "FedRAMP System Security Plan (SSP)".
- Observed: the select already shows "Enterprise Logging and Auditing System Security Plan" (a third SSP, not the active one). In the a11y tree all three options are marked `[selected]`. After picking FedRAMP it still shows "Enterprise Logging...".
- Cause: `SubjectPicker.vue` maps options with `value: ssp.id`, but `/api/oscal/system-security-plans` returns `uuid` and no `id`. Every option value is therefore `undefined`, so the component search is never narrowed to an SSP.
- Expected: the select starts as "SSP: any" (or the active SSP), and the chosen SSP narrows the subject search.
- Evidence: `C-evidence-create-ssp-picker-wrong.jpg`. A fetch of `/api/oscal/system-security-plans` returned keys `control-implementation,import-profile,metadata,system-characteristics,system-implementation,uuid` (id=undefined). Code: `src/components/evidence/SubjectPicker.vue:83-86,122-127`.

### C-02 [P1] [state] Risk detail links depend on the active SSP: "Risk not found" for risks in another SSP, a dead end with no SSP

- URL: `/risks/:riskId`
- Steps: create a risk with FedRAMP active and open it (works). Make IFA GoodRead the active SSP and reload the same URL. Then clear the active SSP and reload.
- Observed: with IFA active the page says "Risk not found. The requested risk could not be located." because it fetches `GET /api/oscal/system-security-plans/<IFA>/risks/<id>`, which returns 404. With no SSP it says "System Security Plan context missing", with no way to recover. The evidence Risks tab describes its list as "Risks linked to this evidence stream, across all system security plans", so links from there can hit this.
- Expected: a risk URL resolves on its own (or the URL carries the SSP), or the page offers to switch to the owning SSP. It should not say "not found" for a risk that exists.
- Evidence: `C-risk-detail-other-ssp-not-found.jpg`, `C-risk-detail-no-ssp.jpg`, and the network 404 above.

### C-03 [P1] [validation] "Save" (new evidence filter) fails silently

- URL: `/evidence?filter=provider=AWS`, then "Save", then `/dashboards/create?filter=provider=AWS`
- Steps: click Save on the evidence list, then click Submit with an empty Name.
- Observed: `POST /api/filters` returns 400. The page doesn't change, and no field error or toast appears. No field is marked required.
- Expected: required markers, plus an inline error on Name.
- Evidence: `C-evidence-save-to-v1-filter-create.jpg` and the network 400. Old audit **A2-UX-EVID-07: still present.**

### C-04 [P2] [state] Subject filter doesn't apply to the "Compliance over time" chart (borderline P1, misleading)

- URL: `/evidence?subject=<Acme Corp uuid>`
- Steps: pick "Acme Corp" in the Subject filter.
- Observed: the table is empty (all seeded evidence is Unattributed), but the chart still shows the global satisfied/not-satisfied curve. `buildEvidenceSearchRequest` adds `subjectUuid` to the search URL only; `complianceParams` carries `interval` and `name`. The Subject dropdown also lists every party and organisation ("Acme Corp", "Amy Assessor", ...), whether or not they have evidence.
- Expected: the chart follows the same scope as the table, or says it is unscoped.
- Evidence: `C-evidence-subject-filter-chart-unscoped.jpg`, `C-evidence-subject-dropdown.jpg`. Code: `src/views/evidence/IndexView.vue:484-500`.

### C-05 [P2] [validation] A POA&M item with a whitespace-only title and description can be created

- URL: `/plan-of-action-and-milestones/6d072a8d-.../poam-items`, then "Add POAM Item"
- Steps: type spaces in Title and Description, then click Create.
- Observed: Create becomes enabled, `POST .../poam-items` succeeds with the toast "POAM Item Created", and a card with no title or description appears. I deleted it afterwards.
- Expected: trim the values and block empty ones.
- Evidence: `C-poam-item-blank-created.jpg`.

### C-06 [P2] [validation] POA&M create form relies on a server error toast

- URL: `/plan-of-action-and-milestones/create`
- Steps: click "Create Plan of Action and Milestones" with an empty Title.
- Observed: `POST /api/oscal/plan-of-action-and-milestones/` returns 400. The toast reads "Failed to create Plan of Action and Milestones: metadata.title is required." No field is marked required and no error appears inline.
- Expected: required markers, an inline error, and user-facing wording (not `metadata.title`).
- Evidence: `C-poam-create-server-validation.jpg`.

### C-07 [P2] [state] Evidence list has no empty or error state; the search syntax is still hard to learn

- URL: `/evidence?filter=provider=GCP`, `/evidence?filter=provider==(AWS`
- Observed:
  - No results: only the table header renders, with no "No evidence matches" message, and the Subject filter disappears (`subjectsSupported` only turns on once a row has `subjectReferences`).
  - Invalid query: the banner reads "Invalid condition format, expected 'label=|!=value'", and both charts render as blank boxes.
  - The placeholder is still `foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)`, and each row still stacks 3 label chips.
- Expected: an empty-state message with a clear-filters action, readable syntax help, and an explicit chart empty state.
- Evidence: `C-evidence-no-results.jpg`, `C-evidence-bad-syntax.jpg`, `C-evidence-list-nossp.jpg`. Old audit: **A2-UX-EVID-01 still present**; **A2-UX-EVID-02 still present** for the no-result and invalid states.

### C-08 [P2] [mixed-shell] The Evidence and Evidence Filters family is split across shells

- URL: `/evidence` (V1), "Save" to `/dashboards/create` (V1), nav "Evidence Filters" to `/dashboards` (V2)
- Observed: the nav item "Evidence Filters" opens a V2 page (monospace caps, flat numbered sidebar, Latte palette). Its create step, reached from "Save" on V1 Evidence, is a V1 form while the V1 sidebar highlights "Evidence Filters". Evidence is the post-login landing page, so the first click into Evidence Filters swaps the whole chrome and type system. The V1 sidebar groups items; the V2 sidebar lists 18 flat numbered items.
- Expected: migrate Evidence, Evidence Filters and filter create together, or at least the create form along with `/dashboards`.
- Evidence: `C-evidence-save-to-v1-filter-create.jpg`, `C-evidence-filters-v2.jpg`, `C-evidence-list-nossp.jpg`.

### C-09 [P2] [state] Inconsistent SSP gates with no CTA

- URL: `/workflow-instances` and `/risks` with no active SSP
- Observed: `/workflow-instances` shows a red-bordered error box ("Please choose an SSP before creating workflow instances.") with no link or button. `/risks` shows the same red box with an inline "SSP Page" text link. V2 pages use an "ACTIVE SSP ... CHANGE" panel instead. `/inventory`, `/evidence` and `/lineage` don't gate at all and show global data, with no hint that an SSP scope exists.
- Expected: one prerequisite component with a "Select SSP" action, as the V2 shell already has.
- Evidence: `C-wf-instances-no-ssp-gate.jpg`, `C-risks-no-ssp-gate.jpg`. Old audit: **A5-UX-EVID-01 still present**.

### C-10 [P2] [visual] Workflow list tables overflow at 1440px; the Status column is blank

- URL: `/workflows`, `/workflow-instances`
- Observed: the Actions column is clipped at the right edge. On definitions only the left edge of "Edit" shows, and "Delete" is off-canvas. On instances only "Execute" is visible, and View/Delete are clipped. The definitions Status column is empty for both rows. The status filter is truncated to "Filter by stat...". Cadence shows the raw cron "Custom (0 0 9 1 1,7 \*)".
- Expected: actions stay visible (kebab menu or a sticky column), Status is filled in, and cron is shown in human terms.
- Evidence: `C-workflow-definitions.jpg`, `C-workflow-instances.jpg`. Old audit: **A5-UX-EVID-03 partially fixed**: instances now show an "active" badge, but definition status is still blank.

### C-11 [P2] [broken] Workflow role assignment shows "Unknown User" and causes a 400

- URL: `/workflow-instances/ac456b8c-.../roles`
- Observed: the Security Lead assignee `security-team` renders as "Unknown User" because the UI calls `GET /api/users/security-team`, which returns 400 (it looks like a group or team id, not a user id). "Internal Audit" appears under "Available Roles" without a warning that it is unassigned, even though the instance is active and has an Execute action.
- Expected: resolve group assignees (or label them as groups), and warn when a step role has no assignee.
- Evidence: `C-wf-instance-roles-unknown-user.jpg` and the console 400.

### C-12 [P2] [responsive] The V1 shell is unusable at 390px

- URL: `/evidence`, `/inventory`, `/risks`, `/workflows` at 390×844
- Observed: the V1 sidebar stays open at about 300px, leaving about 80px of content. The page header wraps one word per line, and `/evidence` scrolls horizontally (scrollWidth 457).
- Expected: the sidebar collapses to a drawer on small screens. The V2 migration should cover this for these pages.
- Evidence: `C-mobile-evidence-v1-sidebar.jpg`, `C-mobile-workflows.jpg`, `C-mobile-inventory.jpg`.

### C-13 [P2] [dark-mode] The V1 theme toggle does nothing

- URL: any V1 page in this group (bottom-right moon button)
- Steps: click "Toggle theme", or set `localStorage.theme='dark'` and reload.
- Observed: no `dark` class is ever applied. `useTheme.ts` hard-codes `FORCED_THEME: Theme | null = 'light'`, yet the toggle (with its tooltip "Left click toggles theme...") still renders on every V1 page.
- Expected: hide the toggle while the theme is forced, or remove the force.
- Evidence: `C-dark-toggle-noop-risk-detail.jpg`. Code: `src/composables/useTheme.ts:8`. Dark mode for this group is therefore **unverified**.

### C-14 [P2] [ux] Two unrelated "POAM items" surfaces

- URL: `/poam-items` vs `/plan-of-action-and-milestones/:id/poam-items`
- Observed: the FedRAMP POA&M has 2 POA&M items, but `/poam-items` (the CCF list, `GET /api/poam-items` returns `{"data":[]}`) shows an empty bordered table with no empty-state text. Its filters are free-text "SSP ID: UUID", "Risk ID: UUID" and "Deadline Before: YYYY-MM-DDTHH:mm:ssZ", plus an explicit Apply button. That matches the Phase 1 "exercise the API filters" scope in `docs/POAM-Design.md`, not an end-user design. The page has no nav entry and its visual style differs from both shells. In the same way, the POA&M Risks tab lists OSCAL risks while the Risk Register lists CCF risks.
- Expected: decide which model the V2 POA&M uses before migrating. If `/poam-items` stays, use pickers instead of UUID inputs and add an empty state.
- Evidence: `C-poam-items-raw-filters.jpg`, `C-poam-items-tab.jpg`.

### C-15 [P2] [navigation] Orphan routes in this group

- Observed: `/inventory`, `/plan-of-action-and-milestones*` and `/poam-items` are not in `navigationItems` (on main they are commented out of `LeftSideNav`), so they are reachable only by URL. There is no workflow-executions list route; executions are only reachable from an instance's Executions tab. Workflow definitions have no import UI.
- Expected: the V2 route inventory should record a keep/drop decision for each (route-inventory lists Inventory, POA&M and POA&M Items as `not_started` with no note that they are hidden).
- Evidence: `src/config/navigation.ts`; `git show main:src/views/LeftSideNav.vue` (lines 92-118 are commented out).

### C-16 [P2] [ux] Compliance Map ignores the active SSP and its metrics are unlabeled

- URL: `/lineage`, `/lineage/graph`
- Observed: the SSP filter starts at "All SSPs" even with FedRAMP active; the scope lives in a separate persisted store. Rows show "0% · 0 / 0 / 0" and "risk 0" with no legend. The NIST row overflows the tree container, which scrolls horizontally, so its metrics are cut off at 1440px. Every node reads 0% even though about 60% of the evidence is satisfied (probably a mapping gap; unverified).
- Expected: default to the active SSP, add a legend or labels for satisfied/not-satisfied/unknown, and avoid horizontal scroll in the tree.
- Evidence: `C-lineage-tree.jpg`, `C-lineage-graph.jpg`.

### C-17 [P2] [a11y] Evidence history uses colour only and has no version context

- URL: `/evidence/history/:uuid`, and the History tab of `/evidence/:id`
- Observed: each version row shows a green/grey/red dot with no text status. The page header is just the stream UUID. The detail page's History tab doesn't highlight which row is the version being viewed. There are no revision numbers or change summary. The "Re-submit" CTA and the update page copy ("Submit a new revision of this evidence...") now explain the versioning model, which is an improvement.
- Expected: text status labels, revision numbers, and a "current" marker.
- Evidence: `C-evidence-history.jpg`, `C-evidence-detail-history-tab.jpg`. Old audit: **A2-UX-EVID-04 partially fixed**.

### C-18 [P2] [ux] "Create Risk from Evidence" makes you pick an SSP even when one is active

- URL: `/evidence/:id`, then Risks tab, then Create Risk
- Observed: with FedRAMP active, the dialog opens with "Select the SSP this risk belongs to" empty, and the form appears only after you choose one. (The Select needs a real pointer event; the form itself has required asterisks and a disabled Create button, which is good.)
- Expected: preselect the active SSP.
- Evidence: `C-evidence-create-risk-dialog.jpg`.

### C-19 [P2] [visual] Saturated, equally weighted action buttons on risk and POA&M detail pages

- URL: `/risks/:id`, `/plan-of-action-and-milestones/:id/poam-items`
- Observed: the risk Lifecycle card has orange "Start Investigation", red "Close Risk", purple "Review Risk Score" and blue "Assign Owner" side by side. Each POA&M item row has purple "Attach / Detach Items", blue "Edit" and solid red "Delete" at the same weight, and the page has a green "Add POAM Item". This palette appears in neither V1 (neutral buttons) nor V2 (Latte). The risk page also repeats the title ("Risk: UXPASS risk" plus a card titled "UXPASS risk") and dumps the full transition matrix inline.
- Expected: one primary action, and destructive actions moved to a secondary position.
- Evidence: `C-risk-detail.jpg`, `C-poam-items-tab.jpg`.

### C-20 [P3] [a11y] Inventory row expand buttons have no accessible name

- URL: `/inventory`
- Observed: clicking "+" now expands the row (description, source, Edit/Attach/JSON/Delete, properties). The button has no `aria-label` or `title` (checked on 3 rows). The expanded details show raw IDs: "System Security Plan (cff8385f...)", and implemented components as bare UUIDs.
- Evidence: `C-inventory-row-expanded.jpg`. Old audit: **A3-UX-EVID-03 partially fixed**.

### C-21 [P3] [ux] Unchecking every inventory source silently shows everything

- URL: `/inventory`
- Observed: the source and item-type filters work now. When all five Sources are unchecked, the list shows all 77 items while every box stays unchecked (`buildQueryParams` falls back to all sources). Filters are not written to the URL.
- Evidence: `C-inventory-all-unchecked-shows-all.jpg`, `C-inventory-default.jpg`. Old audit: **A3-UX-EVID-02 fixed**.

### C-22 [P3] [copy] Risk likelihood and impact use different scales

- URL: `/risks`
- Observed: the filters offer Low/Medium/High/Critical (Medium maps to `moderate`; `?likelihood=moderate` matched the Moderate risk). The create form and badges use Negligible/Low/Moderate/High/Critical, so the filter has no "Negligible" option and calls Moderate "Medium".
- Evidence: page text from the `/risks` run; `src/components/risk/RiskRegisterPanel.vue:167,185`.

### C-23 [P3] [copy] Raw internal values leak into the UI

- Observed:
  - Workflow definition Controls tab: "Catalog: 0f9d8e10-363b-...", a UUID with no catalog name (`C-wf-def-controls-uuid.jpg`).
  - Step graph numbers start at 0 and step names are truncated ("Define control sc...") (`C-wf-def-steps.jpg`).
  - Bogus execution id: "Request failed with status code 404" (`C-wf-execution-404.jpg`).
  - Evidence CSV headers are camelCase (`subjectReferences`, `status.reason`) and `[]` cells.
  - Inventory "unknown" type badge.

### C-24 [P3] [navigation] Tabs and errors that aren't addressable

- Observed: evidence detail tabs are local state, not in the URL, so they can't be deep-linked and Back doesn't step through them. A bogus POA&M id (`/plan-of-action-and-milestones/0000...`) silently redirects to the list after a 404, with no message. A bogus evidence id shows a clear error card (good).

### C-25 [P3] [visual] POA&M detail polish

- URL: `/plan-of-action-and-milestones/:id/*`
- Observed: 10 tabs wrap into two-line labels at 1440px ("POAM / Items", "Import / SSP", "Back / Matter", "JSON / View"). Plurals are wrong ("1 Risks", "1 Observations"). Delete confirmations say "this POAM item" or "this risk" without naming it.
- Evidence: `C-poam-items-tab.jpg`.

### C-26 [P3] [ux] The evidence list's kebab menu hides the create action

- URL: `/evidence`, kebab menu
- Observed: "Create New" evidence is reachable only from the kebab. "Hide" / "Show Hidden" labels use upload icons, and the label text is computed once (`ref`, not `computed`), so it may not change after toggling (unverified).
- Evidence: `C-evidence-menu-share.jpg`.

### C-27 [P3] [validation] Workflow dialogs report one error at a time

- URL: `/workflow-instances`, then New Instance, then Create Instance with everything empty
- Observed: only "Please select a workflow definition" appears; the empty required Instance Name gets no message. New Definition shows "Name is required" next to a visible "Name \*" label.
- Old audit: **A5-UX-EVID-05 fixed** (visible label).

## 3. What works well (keep)

- **Control link create** (`/control-links/new`): every required field gets its own inline error ("Source catalog is required", "Relationship is required", ...). The Single control / Whole catalog switch explains the fan-out. Header and footer both have Cancel. This is the best form pattern in the group (`C-control-link-validation.jpg`).
- **Evidence list state lives in the URL** (`?filter`, `?subject`, `?sortBy`, `?sortDirection`, `?page`). Share copies the URL and confirms with a "Link Copied" toast. Sort buttons announce their state to screen readers ("Sorted ascending. Activate to reverse sort direction.").
- **CSV export** includes labels as `label.*` columns and respects the current filter.
- **Evidence detail** has a good summary card (status, signature, collected, expiry), clear empty states on Metadata, Risks, Media and Signature, and a clear 404 card. The update page explains revisions.
- **Risk register**: KPI cards, a full filter set synced to the URL, an explicit "No risks found.", and a create form with asterisks and a disabled submit. The risk detail tabs (Evidence/Controls/Threats/History) all have empty states with an add action.
- **Inventory filters work** now, and rows expand inline.
- **The active SSP is visible in the V1 header** ("Active System: FedRAMP System Security Plan (SSP)"), so A2-UX-EVID-08 is fixed.
- **Workflows**: the step graph, a populated instance Overview, the Executions empty state ("Click 'Execute Now' to start your first workflow execution."), labelled create dialogs, and the My Tasks empty state.

## 4. Previously audited issues (Feb 2026)

| ID                                     | Issue                                                           | Status                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A2-UX-EVID-01                          | Search placeholder is a dummy expression; rows heavy with chips | **Still present** (C-07)                                                                                                       |
| A2-UX-EVID-02                          | Charts blank with no loading/empty messaging                    | **Still present** for invalid-query and no-result states; charts render with data otherwise (C-07)                             |
| A2-UX-EVID-03                          | Evidence create: required dates not obvious, silent validation  | **Partially fixed**: browser "Please fill out this field" bubble on Title; still no required markers                           |
| A2-UX-EVID-04                          | "Update Evidence" is really "new version"                       | **Partially fixed**: renamed "Re-submit" with explanatory copy; history still lacks revision numbers and change summary (C-17) |
| A2-UX-EVID-05                          | Media panel has no empty state or CTA                           | **Partially fixed**: "No displayable media resources..." empty state; no attach CTA                                            |
| A2-UX-EVID-06                          | Dashboards list puts Delete first                               | **Improved**: V2 cards use a small trash icon (Dashboards is mainly another group's scope)                                     |
| A2-UX-EVID-07                          | Dashboard (filter) create has no validation                     | **Still present**: silent 400 (C-03)                                                                                           |
| A2-UX-EVID-08                          | Active SSP not visible on Evidence/Dashboards                   | **Fixed** (V1 header "Active System: ..."; V2 ACTIVE SSP panel)                                                                |
| A3-UX-EVID-02 / master #9              | Inventory Sources checkboxes do nothing                         | **Fixed**; all-unchecked edge case remains (C-21)                                                                              |
| A3-UX-EVID-03 / SCN-03                 | Inventory row action unlabeled, no details                      | **Partially fixed**: expands with details; button still unlabeled (C-20)                                                       |
| A5-UX-EVID-01                          | Workflow Instances SSP gate has no CTA                          | **Still present** (C-09)                                                                                                       |
| A5-UX-EVID-02                          | Definition list step count contradicts detail                   | **Fixed** (list 5 = "Steps (5)")                                                                                               |
| A5-UX-EVID-03                          | Blank status columns                                            | **Partially fixed**: instances show "active"; definition Status still blank (C-10)                                             |
| A5-UX-EVID-04                          | Execute disabled in list without explanation                    | **Likely fixed**: list shows an enabled "Execute" and detail has "Execute Now"; not exercised                                  |
| A5-UX-EVID-05                          | New Definition name has no visible label                        | **Fixed** ("Name \*" plus "Name is required")                                                                                  |
| A5-UX-EVID-06                          | Execution status shows `in_progress`, metrics inconsistent      | **Unverified** (no executions seeded; I did not execute)                                                                       |
| A5-UX-EVID-07                          | "No Permission" on a step with no remediation path              | **Unverified** (no executions)                                                                                                 |
| A5-UX-EVID-08                          | Instance Overview tab empty                                     | **Fixed** (edit form, linked definition, metadata)                                                                             |
| master #10                             | Evidence list density and search learnability                   | **Still present** (C-07)                                                                                                       |
| ux-expert "Standard prerequisite gate" | One SSP gate component                                          | **Not done** in V1 (C-09)                                                                                                      |
