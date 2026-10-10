# Browser UX pass, group B-ssp: SSP library, SSP detail, Active System (`/system/*`)

Run date: 2026-10-10. UI http://localhost:3000, API http://localhost:8080, user admin@example.com.
Viewport 1440×900 unless noted. Screenshots are in
`thread-storage/thr_yy6iaqjxfk/browser-pass/shots/B-*.jpg` (filenames below).

SSPs used: FedRAMP `9809eddf…0629` (linked profile, 664 requirements), GoodRead `5e139edd…6658`
(linked profile, 664 requirements, 0 statements), Enterprise `cff8385f…aba8` (no profile).

Test data was created and cleaned up as follows:

- A UXPASS component and a UXPASS statement-level by-component on FedRAMP `ac-1_smt` were created, then deleted in the UI.
- A blank property was saved by accident on the FedRAMP implementation overview (see B-02). It was removed in the UI, and the API now returns the original 4 props with their `ns`.
- A UXPASS SSP was created in the UI. The UI has no way to delete an SSP, so it was deleted through `DELETE /api/oscal/system-security-plans/:id` (204).
- When finished, the active SSP was set back to FedRAMP.

The "UXPASS risk" on FedRAMP was not created by this group and was left alone.

## 1. Coverage

| Route                                                                             | Shell                                 | States checked                                                                                                                                                                          | #findings |
| --------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: |
| `/system-security-plans`                                                          | V2                                    | list, set active, JSON download, mobile                                                                                                                                                 |         3 |
| `/system-security-plans/create`                                                   | V2                                    | empty validation, create, redirect                                                                                                                                                      |         1 |
| `/system-security-plans/:id` (overview)                                           | V2 (Risk Overview block is V1-styled) | FedRAMP, GoodRead, Enterprise (no profile), new empty SSP, mobile                                                                                                                       |         4 |
| `…/:id/system-characteristics`                                                    | V2                                    | 3 SSPs, empty SSP                                                                                                                                                                       |         2 |
| `…/:id/system-implementation` (sub-tabs Overview/Users/Components/Authorizations) | V2                                    | edit overview, add/remove property, create/edit user, create/edit component, create authorization validation                                                                            |         7 |
| `…/:id/users` (route not in tab bar)                                              | V1_in_V2_shell                        | list                                                                                                                                                                                    |         1 |
| `…/:id/components` (tab 07)                                                       | V1_in_V2_shell                        | list                                                                                                                                                                                    |         1 |
| `…/:id/authorizations` (route not in tab bar)                                     | V1_in_V2_shell                        | list                                                                                                                                                                                    |         1 |
| `…/:id/control-implementation`                                                    | V2                                    | FedRAMP requirement → statement → by-component; statement-level create/delete; requirement-level create attempt; add-requirement validation; Enterprise (no profile); empty SSP; mobile |         7 |
| `…/:id/export-offerings`, `/leverage`, `/inherited-capabilities`                  | V1_in_V2_shell                        | empty states                                                                                                                                                                            |         1 |
| `…/:id/risks`                                                                     | V1_in_V2_shell                        | list                                                                                                                                                                                    |         1 |
| `…/:id/risks/:riskId`                                                             | V1_in_V2_shell                        | detail, bogus risk id                                                                                                                                                                   |         2 |
| `…/:id/compliance`                                                                | V2                                    | FedRAMP, GoodRead, Enterprise (no profile)                                                                                                                                              |         2 |
| `…/:id/json`                                                                      | V2                                    | FedRAMP, Enterprise                                                                                                                                                                     |         0 |
| `/system-security-plans/<bogus>`                                                  | V2                                    | 404 UUID, 400 non-UUID                                                                                                                                                                  |         1 |
| `/system` (overview)                                                              | V2                                    | no active SSP, active SSP, Select dialog, mobile                                                                                                                                        |         3 |
| `/system/characteristics`                                                         | V1_in_V2_shell                        | no SSP, active, edit and revert                                                                                                                                                         |         2 |
| `/system/implementation`                                                          | V1_in_V2_shell                        | no SSP, active                                                                                                                                                                          |         1 |
| `/system/users`, `/system/authorizations`                                         | V1_in_V2_shell                        | no SSP (blank), active, V1 create modal                                                                                                                                                 |         2 |
| `/system/components`                                                              | V1_in_V2_shell                        | no SSP, active                                                                                                                                                                          |         1 |
| `/system/control-implementation`                                                  | V1_in_V2_shell                        | no SSP (blank), active                                                                                                                                                                  |         1 |
| `/system/export-offerings`, `/leverage`, `/inherited-capabilities`                | V1_in_V2_shell                        | no SSP, active                                                                                                                                                                          |         1 |
| `/system/risks`                                                                   | V1_in_V2_shell                        | no SSP, active                                                                                                                                                                          |         1 |
| `/system/compliance`                                                              | V1_in_V2_shell                        | no SSP (**app crashes**), active                                                                                                                                                        |         2 |
| `/system/json`                                                                    | V1_in_V2_shell                        | no SSP (400), active                                                                                                                                                                    |         1 |
| `/system/components/dashboards/:componentId`                                      | V1_in_V2_shell                        | not visited (unverified)                                                                                                                                                                |         0 |

Dark mode: `useTheme.ts` forces `FORCED_THEME = 'light'` and no theme toggle is rendered, so users
cannot reach dark mode. I forced `html.dark` once to look at the rendering (B-31).

## 2. Findings

### B-01 [P1] [broken] `/system/compliance` with no active SSP blanks the whole app

- URL: `/system/compliance` (fresh session, no active SSP)
- Steps: log in, don't select an SSP, open `/system/compliance` directly or via the COMPLIANCE tab.
- Observed: a completely white page. The shell, sidebar and header all disappear. Console shows `Vue warn: Unhandled error during execution of setup function at <RouterLink> at <SystemSecurityPlanComplianceView ssp-id="">`, then `PAGEERROR: Error: Missing required param "id"`.
- Expected: the same "No active system security plan / Select active SSP" gate that `/system` shows.
- Evidence: `B-system-compliance-no-ssp-blank.jpg`. Console output captured in the run.

### B-02 [P1] [validation] The implementation overview editor saves a blank property and ignores its required REMARKS field

- URL: `/system-security-plans/9809…0629/system-implementation` → EDIT
- Steps: open EDIT. The drawer shows `REMARKS *` (empty) and 4 properties. Click ADD PROPERTY, leave it empty, click SAVE.
- Observed: the toast says "Overview saved". The seeded FedRAMP SSP now has a 5th property shown as `UNNAMED PROPERTY: none`, and the required REMARKS field was not enforced. I removed the property and saved again; the API now returns the original 4 props.
- Expected: block saving when the remarks or the property name/value are empty, as the User, Component and Authorization drawers do.
- Evidence: `B-impl-overview-saved-blank-property.jpg`.

### B-03 [P1] [state] Every `/system/*` child handles "no active SSP" differently, and several mislead the user

- URL: `/system/*` with no active SSP
- Observed:
  - `/system`: a good gate with a "Select active SSP" CTA (`B-system-no-active-ssp.jpg`).
  - `/system/compliance`: crashes (B-01).
  - `/system/users`, `/system/authorizations`, `/system/control-implementation`: the content area is blank below the tabs.
  - `/system/characteristics`: KPI cards ("N/A", "Not Authorized", "0%"), an enabled EDIT button and a raw `AxiosError: Request failed with status code 400` (`B-system-characteristics-no-ssp-axios400.jpg`). The API is called as `GET /api/oscal/system-security-plans//system-characteristics` (with `/authorization-boundary`, `/network-architecture` and `/data-flow`), all returning 400.
  - `/system/implementation`: an empty overview with an enabled Edit button; `GET …//system-implementation` returns 400.
  - `/system/components`: "No components defined. Create your first component to get started." with an enabled Create Component button.
  - `/system/leverage` and `/system/inherited-capabilities`: "No … yet" empty states.
  - `/system/json`: `GET …//full` returns 400.
  - `/system/risks` and `/system/export-offerings`: the old V1 "System Security Plan not selected … return to the SSP Page" alert.
- Expected: every child shows the same gate as `/system`, and no API calls go out with an empty id.
- Old audit: A3-UX-EVID-01 and A1-UX-EVID-01 are fixed on `/system` itself but **still present** on the children.

### B-04 [P1] [broken] The V1 system characteristics editor can't clear a field, and its PUT sends blank and camelCase keys

- URL: `/system/characteristics` → EDIT (tested on the throwaway UXPASS SSP, which I made active for the test)
- Steps: set Short Name to " UXPASS" and SUBMIT; it saved. Then set Short Name to empty and SUBMIT.
- Observed: the UI closes the dialog without a toast, but the API still returns `system-name-short: " UXPASS"`. The edit can't be reverted from the UI.
- The PUT body was `{"authorization-boundary":{"description":""},"description":"","status":{"state":""},"system-ids":null,"system-information":{"informationTypes":null},"system-name":"UXPASS SSP","system-name-short":""}`. It blanks fields the form doesn't contain and sends a camelCase `informationTypes` key to an OSCAL (kebab-case) endpoint.
- Whether this wipes the status or information types on a fully populated SSP is **unverified**. I deliberately did not run it against seeded SSPs.
- Expected: empty values clear the field; fields not in the form are left alone; keys are kebab-case.
- Evidence: PUT payload and API read-back from the run.

### B-05 [P1] [navigation] The V2 SSP detail has no way to edit system information or metadata

- URL: `/system-security-plans/:id` (overview) and `…/system-characteristics`
- Observed:
  - The V2 overview has no Edit Metadata and no Download JSON. The JSON tab does have Download JSON.
  - The V2 characteristics page shows only KPI cards and diagrams (`B-ssp-fedramp-characteristics.jpg`). System name, short name, description, sensitivity and status can't be edited.
  - The only editor is the V1 `/system/characteristics` page, which works only on the _active_ SSP and has the bug in B-04.
  - To edit a non-active SSP's characteristics, the user has to make it active first. The handoff (`ssp-detail-pages-unification-handoff.md`) lists "Edit Metadata" and "Edit System Characteristics" as existing features.
- Expected: V2 editors for metadata and system information on the SSP detail.

### B-06 [P2] [ux] The UI has no requirement-level by-component create; only the statement level has one, and its button label is misleading

- URL: `…/9809…0629/control-implementation`, requirement `ac-1`
- Observed:
  - The REQ COMPONENTS (0) tab says only "No requirement-level component implementations are defined." It has no add action.
  - The V2 view never mounts `ByComponentModalForm` in create mode without a statement. The requirement-level POST (`…/implemented-requirements/:id/by-components`, known 404) is therefore **unreachable from the UI**: the user simply has no control for it.
  - V1 `/system/control-implementation` has no requirement-level add either.
  - Statement level works. On `ac-1_smt`, "CREATE COMPONENT" opens "CREATE BY-COMPONENT IMPLEMENTATION". Empty submit gives "Component is required. / Description is required." (`B-ctrl-bycomponent-validation.jpg`). Creating with the UXPASS component bumped "Component implementations" from 111 to 112, and deleting it after the confirm dialog brought it back to 111.
- Issues:
  - The button label "CREATE COMPONENT" reads like creating a _system_ component.
  - The drawer doesn't say which statement it's attached to.
  - The drawer subtitle says "Map requirement behavior…" although the drawer is statement-scoped.
- Evidence: `B-ctrl-statement-bycomponent-drawer.jpg`, `B-ssp-fedramp-controls.jpg`.

### B-07 [P2] [mixed-shell] The same entities appear twice on the SSP detail, with two different editors

- URL: `…/:id/system-implementation` (V2 sub-tabs USERS/COMPONENTS/AUTHORIZATIONS with drawers) vs tab `07 COMPONENTS` and the hidden routes `…/:id/users` and `…/:id/authorizations` (V1 lists and modals)
- Observed:
  - Components are listed under both 03 IMPLEMENTATION → COMPONENTS and 07 COMPONENTS, and the two lists look and edit differently.
  - `…/users` and `…/authorizations` are reachable by URL, but they have no tab and no tab is highlighted while you are on them.
  - `/system` overview's MANAGE USERS / COMPONENTS / AUTHORIZATIONS buttons lead to the V1 versions. Its Create User is a V1 modal with blue and green buttons (`B-system-users-v1-create-modal.jpg`), while the SSP detail uses a V2 drawer (`B-impl-create-user-validation.jpg`).
- Evidence: `B-ssp-tab07-components-v1.jpg`, `B-ssp-authorizations-hidden-route-v1.jpg`, `B-impl-users-list.jpg`.

### B-08 [P2] [mixed-shell] V1 pages render inside the V2 SSP shell

- URL:
  - `…/:id` tabs 07 COMPONENTS, 08 RISKS, 09 EXPORT OFFERINGS, 10 LEVERAGE, 11 INHERITED CAPABILITIES, plus `risks/:riskId`, `users` and `authorizations`.
  - Every `/system/*` child except the overview.
- Observed: rounded white cards, sans and mixed-case headings, and coloured pill tabs and buttons (blue, orange, red, purple on the risk detail) under the V2 numbered tab bar.
- The V2 overview also embeds the V1-styled "Risk Overview" block (rounded white cards) above the V2 stat tiles.
- Evidence: `B-ssp-risk-detail-v1-in-v2.jpg`, `B-ssp-tab08-risks-v1.jpg`, `B-ssp-fedramp-overview-top.jpg`, `B-system-control-implementation-v1.jpg`, `B-system-characteristics-v1.jpg`.
- Old audit: A6-UX-EVID-03 **still present**.

### B-09 [P2] [mixed-shell] The `/system` overview lacks profile binding, the compliance preview, diagrams and Download JSON

- URL: `/system` with FedRAMP active, compared with `/system-security-plans/9809…0629`
- Observed: the `/system` overview text contains no Profiles control, no COMPLIANCE PREVIEW, nothing about diagrams and no DOWNLOAD JSON. It shows only the active-plan card, stat tiles, a characteristics summary and Risk Overview.
- The SSP overview has the profile MultiSelect and switcher plus the compliance preview card (`B-ssp-fedramp-overview-compliance-preview.jpg`).
- Last modified, published and remarks are not shown on `/system` either.
- This confirms parity-drift rows 1–4 and 7.
- Evidence: `B-system-overview-active.jpg`.

### B-10 [P2] [mixed-shell] `/system/compliance` is the V1 view while the SSP compliance tab is V2

- URL: `/system/compliance` vs `…/9809…0629/compliance`
- Observed: the two pages show the same numbers (0 satisfied / 8 not satisfied / 656 unknown, 19 implemented / 645 not implemented) in different visual systems. The V1 one has rounded tinted cards and mixed case.
- `/system/compliance` has no profile switcher and doesn't say which profile is shown.
- Evidence: `B-system-compliance-v1.jpg`, `B-ssp-fedramp-compliance.jpg`.

### B-11 [P2] [ux] The SSP header has two profile controls that look alike

- URL: any `/system-security-plans/:id` tab
- Observed: a "PROFILES" MultiSelect (which binds profiles to the SSP and saves immediately) sits directly above a "PROFILE ▾" button (which picks the profile the compliance views use). Nothing explains the difference. Both are bordered in orange.
- Expected: label them distinctly, e.g. "Linked profiles" and "View compliance for".
- Evidence: `B-ssp-fedramp-overview-top.jpg`.

### B-12 [P2] [validation] V2 edit drawers can't save seeded records because their required fields are stricter than the data

- URL: `…/system-implementation` → USERS → EDIT on "[SAMPLE]Unix System Administrator"; COMPONENTS → EDIT on "Name of Leveraged System"
- Observed:
  - Saving the user unchanged is blocked by "Description is required." The seeded users have no description.
  - Saving the component is blocked by "Purpose is required."
  - So any edit, even fixing a typo in a title, forces the user to make up content.
  - The UUID field is an editable textbox in edit mode.
- Evidence: `B-impl-edit-seeded-user-blocked.jpg`, `B-edit-component-type-blank.jpg`.

### B-13 [P2] [ux] The component type list is missing types used in the data, so Type shows blank on edit

- URL: `…/system-implementation` → COMPONENTS → EDIT "Name of Leveraged System" (type `leveraged-system`)
- Observed: the TYPE select renders empty. The options don't include `leveraged-system`, or `procedure` (used by "[EXAMPLE]Procedures"). The form keeps the value internally, so saving untouched is probably fine (unverified), but the user can't see or re-select the real type.
- Evidence: `B-edit-component-type-blank.jpg`.

### B-14 [P2] [ux] Creating a leveraged authorization still needs a raw Party UUID

- URL: `…/system-implementation` → 04 AUTHORIZATIONS → CREATE AUTHORIZATION
- Observed: validation lists "Title / Party UUID / Date authorized is required". PARTY UUID is a free-text field with no picker.
- Old audit: A3-UX-EVID-07 (P1) **still present**.
- Evidence: `B-create-authorization-party-uuid.jpg`.

### B-15 [P2] [ux] The control-implementation requirement list has 664 items, no search and no sort

- URL: `…/9809…0629/control-implementation`
- Observed: the left list runs ac-1, ac-2, at-1 … sr-1, then ma-5, si-4.13, ia-8 … in no meaningful order. There is no filter or search, and the page is very long.
- Evidence: `B-ssp-fedramp-controls.jpg`.

### B-16 [P2] [copy] "Implemented" means different things on Controls and Compliance

- URL: Controls tab vs Compliance tab, FedRAMP
- Observed: Controls says "IMPLEMENTED REQUIREMENTS 664". Compliance says "IMPLEMENTATION COVERAGE 3% — 19 IMPLEMENTED / 645 NOT IMPLEMENTED". On GoodRead, Controls shows 664 implemented requirements while Compliance shows "0 implemented / 664 not implemented".
- Evidence: `B-ssp-fedramp-controls.jpg`, `B-ssp-fedramp-compliance.jpg`.

### B-17 [P2] [ux] Add Requirement takes a free-text Control ID

- URL: `…/control-implementation` → ADD REQUIREMENT
- Observed: CONTROL ID \* is a plain textbox with no picker from the linked profile. Validation works ("Control ID is required."). The create drawer's subtitle says "Edit requirement-level remarks…".
- Evidence: `B-ctrl-add-requirement-validation.jpg`.

### B-18 [P2] [responsive] At 390 px the SSP list clips its actions and Controls scrolls horizontally

- URL: `/system-security-plans` and `…/control-implementation` at 390×844
- Observed:
  - List: the ACTIONS column is cut off. "VIE…" is visible, while JSON and Set are off-screen inside the table.
  - Detail: the title, metadata strip (its own scrollbar), two profile controls and the tab strip take about 650 px before any content.
  - Controls: the document is 597 px wide, so the whole page scrolls horizontally.
- Evidence: `B-mobile-ssp-list.jpg`, `B-mobile-ssp-detail.jpg`, `B-mobile-ssp-controls-overflow.jpg`.

### B-19 [P2] [visual] The SSP tab bar overflows, its labels collide, and sub-routes lose the active tab

- URL: `/system-security-plans/:id/*` at 1440 px
- Observed:
  - Eleven tabs sit in a strip with a horizontal scrollbar, and tabs 09–11 are hidden off-screen.
  - The labels run together: "02 CHARACTERISTICS03 IMPLEMENTATION".
  - On `risks/:riskId`, `users` and `authorizations` no tab is highlighted. `/system/users` and `/system/authorizations` likewise highlight no `/system` tab.
- Evidence: `B-ssp-fedramp-overview-top.jpg`, `B-ssp-risk-detail-v1-in-v2.jpg`, `B-system-users-no-tab-highlight.jpg`.

### B-20 [P2] [copy] Placeholder text is displayed as if it were real content

- URL: `…/system-implementation` overview, and `…/control-implementation` on a new SSP
- Observed:
  - The FedRAMP and GoodRead implementation REMARKS show "Describe the system implementation and any additional remarks.", but the field is actually empty: the edit drawer is blank, and V1 `/system/implementation` says "No remarks provided."
  - A freshly created SSP's control implementation DESCRIPTION shows "Access control implementation narrative with requirement-level and component-level mappings." This is a hard-coded fallback (`SystemSecurityPlanControlImplementationView.vue:65`).
- Evidence: `B-ssp-fedramp-implementation.jpg`, `B-new-ssp-controls-placeholder-description.jpg`.

### B-21 [P2] [a11y] V2 drawer text inputs have no accessible name

- URL: CREATE COMPONENT drawer
- Observed: in the accessibility tree, TYPE and STATUS STATE are named comboboxes, but Title, Description, Purpose and the remarks fields are unnamed `textbox` nodes. Their visible labels aren't associated with the inputs.
- Evidence: snapshot output (`textbox [ref=e431]` etc.) and `B-create-component-drawer.jpg`.

### B-22 [P3] [copy] "System Users" names two different things

- The sidebar item "14 SYSTEM USERS" (`/users`, app accounts) and the SSP's "SYSTEM USERS" (OSCAL users) share a name.
- Evidence: `B-system-users-no-tab-highlight.jpg`.

### B-23 [P3] [visual] Stray "v" characters

- Implementation user and component card titles render as "v [SAMPLE]UNIX SYSTEM ADMINISTRATOR" and "v THIS SYSTEM".
- The `/system` Active SSP bar shows "vfedramp2.1.0-oscal1.0.4", because the version already starts with "fedramp".
- Evidence: `B-impl-users-list.jpg`, `B-system-overview-active.jpg`.

### B-24 [P3] [state] Error states show raw HTTP or Axios text

- Observed:
  - `/system-security-plans/00000000-…` shows "LOAD FAILED: Request failed with status code 404"; `not-a-uuid` shows "…400". RETRY and BACK TO LIST are present, which is good.
  - `/system/characteristics` with no SSP shows "AxiosError: …400".
  - An unknown risk id shows a friendly "Risk not found".
- Evidence: `B-ssp-bogus-id.jpg`, `B-system-characteristics-no-ssp-axios400.jpg`.

### B-25 [P3] [ux] Some downloads give no feedback, and some options can't be told apart

- The per-row JSON buttons in the implementation Users, Components and Authorizations lists download silently. The library's JSON shows a "SSP JSON DOWNLOADED" toast.
- The by-component Component select lists "[SAMPLE]Cryptographic Module Name" twice with nothing to tell them apart.

### B-26 [P3] [visual] UUIDs are shown in uppercase

- The caps styling uppercases UUIDs: "UUID: EEE8697A-....", "CFF8...ABA8", "E34E3F9D".
- Evidence: `B-ssp-enterprise-controls-no-profile.jpg`.

### B-27 [P3] [visual] The compliance legend is ambiguous

- Each colour swatch sits after its label ("SATISFIED ■ NOT SATISFIED ■ UNKNOWN ■"), so a swatch reads as belonging to the next label.
- Inherited is missing from the legend.
- Evidence: `B-ssp-fedramp-compliance.jpg`.

### B-28 [P3] [state] Expected 404s are logged as console errors

- Enterprise characteristics logs `404` for `…/system-characteristics/network-architecture` and `/data-flow`. The UI shows proper "No diagrams yet" empty states, but the console fills with errors.

### B-29 [P3] [copy] Small inconsistencies on the library page

- The breadcrumb says "DASHBOARD" on the SSP Library page.
- The row action "Set" is mixed case while VIEW and JSON are caps.
- IMPORT jumps to `/admin/import`, which renders in the V1 shell (the whole shell swaps).
- Evidence: `B-ssp-list.jpg`.

### B-30 [P3] [ux] Empty states don't say what fixes them

- On the no-profile Enterprise SSP, the Controls detail shows the heading "No requirement title available." without explaining that linking a profile resolves titles.
- Compliance says "Attach a profile in OVERVIEW", but the profile control is in the header on every tab.
- Evidence: `B-ssp-enterprise-controls-no-profile.jpg`, `B-ssp-enterprise-compliance-no-profile.jpg`.

### B-31 [P3] [dark-mode] Dark mode is forced off, and V1 blocks look off when forced on

- Dark mode can't be reached: `FORCED_THEME = 'light'` and there is no toggle.
- With `html.dark` forced, the V1 components tab renders dark, but the tab-strip scroll track stays white.
- Evidence: `B-forced-dark-ssp-components.jpg`.

### Data observations (not UI bugs)

- The FedRAMP seed users carry 4 identical `authorized-privileges` entries, so the list repeats "FULL ADMINISTRATIVE ACCESS (ROOT)" ×4.
- The seeded "FedRAMP Rev 5 Low" profile resolves to 664 controls including enhancements, so the 664 denominators are consistent with the data.

## 3. What works well

- **Set active.** Setting an SSP active in the library gives a toast ("Active SSP Updated"), adds an `[ACTIVE]` tag and disables Set (`B-ssp-list-after-set.jpg`). The detail header shows ACTIVE/INACTIVE and a disabled SET ACTIVE.
- **`/system` gate and switcher.** The no-SSP gate has a clear primary CTA ("Select active SSP" → `/system-security-plans?next=/system`). The Select/Change dialog is searchable.
- **V2 drawers.** They have an error summary ("PLEASE FIX THE FOLLOWING"), inline field errors and focus on the first invalid field. The User dialog no longer duplicates fields (A3-05), and the Component drawer distinguishes Status Remarks from Remarks (A3-06).
- **Destructive actions** use a confirm dialog that names the item ("ESC TO CANCEL • ENTER TO CONFIRM").
- **Create SSP.** Clear validation; after create it lands on the new SSP's detail page.
- **Statement-level by-component** create and delete work end to end, and the counts update.
- **Detail error state** for a bad SSP id offers RETRY and BACK TO LIST. The no-profile compliance state is explicit.
- **JSON tab** has Download and Copy and states its source endpoint.
- **Diagrams.** Each "ADD DIAGRAM" sits inside its own category card (Authorization Boundary, Network Architecture, Data Flow).

## 4. Previously audited issues (Feb 2026)

| ID                                     | Issue                                                                             | Status                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-UX-EVID-01                          | SSP gating copy/CTA inconsistent                                                  | Fixed on `/system`; **still present** on `/system/*` children (B-03), worse on `/system/compliance` (B-01)                                               |
| A1-UX-EVID-02 / A6-UX-EVID-01 / SCN-01 | "Set" feedback subtle, label never changes                                        | Fixed (toast, `[ACTIVE]` tag, disabled Set, Change in the `/system` bar). There is still no "unset".                                                     |
| A1-UX-EVID-03                          | Active SSP not visible globally                                                   | Mostly fixed: indicator on V2 non-SSP routes and `/system`; the V1 header shows "Active System: …" (seen on `/admin/import`). Not checked on every page. |
| A3-UX-EVID-01                          | `/system` hard stop without an action                                             | Fixed on the overview; still present on the children (B-03)                                                                                              |
| A3-UX-EVID-04                          | Repeated "Add Diagram" CTAs                                                       | Partly fixed (each scoped to its category card in V2). Delete is an unlabeled "x". `/system` has no diagrams section at all (B-09).                      |
| A3-UX-EVID-05                          | Create User dialog duplicated fields                                              | Fixed (V2 drawer and V1 modal)                                                                                                                           |
| A3-UX-EVID-06                          | "Remarks" twice in Create Component                                               | Fixed (Status Remarks vs Remarks)                                                                                                                        |
| A3-UX-EVID-07                          | Raw Party UUID for authorization                                                  | **Still present** (B-14)                                                                                                                                 |
| A6-UX-EVID-03                          | Editor tab UI inconsistent                                                        | **Still present** (V2 numbered tabs, V2 sub-tabs, V1 pill tabs on risk detail; B-08, B-19)                                                               |
| A6-UX-EVID-04                          | Primary action placement varies                                                   | Still present in part: header SET ACTIVE, per-section EDIT, and no metadata edit (B-05)                                                                  |
| A6-UX-EVID-07                          | Raw UUIDs as prominent metadata                                                   | Improved in the detail header (truncated plus copy button). The list and `/system` still show full UUIDs.                                                |
| Parity-drift `/system` rows 1–4, 7     | Profile binding, compliance preview, diagrams, Download JSON and metadata missing | Confirmed in the UI (B-09)                                                                                                                               |
| Parity-drift endpoint note             | Requirement-level `by-components` POST                                            | Not reachable from the UI: there is no create control (B-06)                                                                                             |
