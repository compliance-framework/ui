# Browser UX pass: A-shell (auth, app shell & navigation, dashboards, controls, V2 sandboxes)

Date: 2026-10-10. Environment: local-dev (UI http://localhost:3000, API http://localhost:8080), logged in as admin@example.com.
Viewports: 1440×900 (light), 390×844 (mobile). Screenshots: `thread-storage/.../browser-pass/shots/A-*.jpg`.
Dark mode could not be exercised: it is force-disabled on this branch (see A-09).

## 1. Coverage

| Route                                                                       | Shell                       | States checked                                                                                                                                                              | # findings |
| --------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `/auth/login`                                                               | Guest V2                    | default, empty submit, wrong password, `?error=session_expired`, `?next=` (safe and `//evil`), already-authenticated visit; login banner not configured in env (unverified) | 4          |
| `/auth/forgot-password`                                                     | Guest V2                    | default, empty submit                                                                                                                                                       | 1          |
| `/auth/password-reset`                                                      | Guest V2                    | no token, bogus token                                                                                                                                                       | 1          |
| `/auth/logout` + V2 user-menu Logout                                        | Guest V2 / V2               | V1 sidebar link, V2 menu item, re-login                                                                                                                                     | 2          |
| `/` (post-login landing)                                                    | redirects to V1 `/evidence` | after login, unauthenticated `/`                                                                                                                                            | 1          |
| V1 shell (`/evidence`, `/dashboards/create`, `/dashboards/suggestions/:id`) | V1                          | nav, profile menu, theme toggle, 390px                                                                                                                                      | 3          |
| V2 shell (`/dashboards`, `/controls`, `/__v2/*`)                            | V2                          | nav, user menu, Active SSP indicator (select/change, no clear), Tab focus, 390px                                                                                            | 4          |
| `/dashboards`                                                               | V2                          | list, delete (UXPASS record), loading/empty code paths                                                                                                                      | 4          |
| `/dashboards/:id`                                                           | V2                          | real id, bogus id                                                                                                                                                           | 1          |
| `/dashboards/create`                                                        | V1                          | empty submit, successful create (UXPASS, then deleted)                                                                                                                      | 1          |
| `/dashboards/suggestions/:sspId`                                            | V1                          | FedRAMP SSP, bogus id                                                                                                                                                       | 1          |
| `/controls`                                                                 | V2                          | no SSP, Enterprise SSP (no profile), FedRAMP SSP; tree expand, search hit/miss, filter chip, OPEN drawer, IMPLEMENT drawer, Edit Statement (edited and reverted), keyboard  | 9          |
| `/__v2/components`, `/__v2/tokens`                                          | V2                          | reachability                                                                                                                                                                | 1          |
| 404 (`/this-does-not-exist-uxpass`)                                         | none (bare V1 styling)      | direct URL                                                                                                                                                                  | 1          |

Transition V1 ↔ V2 (`/evidence` → `/dashboards`, `/evidence` → `/controls`, and back): every hop swaps the whole chrome. The sidebar changes from a 320px grouped, collapsible Inter sidebar to a 240px flat, numbered monospace list. The header changes from "Active System: …" text plus an avatar dropdown to a "CCF" logo bar with a name and caret. The Active SSP banner appears or disappears, and the floating theme toggle appears or disappears. Typography (Inter vs JetBrains Mono/Space Grotesk), palette and corner radius all change. There is no transition and no console error. The swap is clean but very noticeable (compare `A-post-login-landing-v1-evidence.jpg` with `A-v2-shell-dashboards.jpg`).

Nav diff (V1 `LeftSideNav` vs V2 `V2SideNavigation`, both built from `src/config/navigation.ts`):

- The same 18 destinations appear in the same order with the same labels: Active System, Manage Systems, Evidence, Controls, Compliance Map, Risk Register, Evidence Filters, Workflow Definitions, Workflow Instances, Catalogs, Control Links, Profiles, Risks, System Users, Groups, Agents, Diagnostics, Import. This matches main's item list.
- V1 groups them under the collapsible headings Systems / Workflows / Control Definitions / Admin. V2 drops the headings and numbers the items 01–18, so "06 Risk Register" and "13 Risks" (admin risk templates) sit side by side with nothing to tell them apart. See A-10.
- V1 has "Logout" at the bottom of the sidebar. V2 has it only in the user menu and shows "USER / ADMIN" (the email's local part) in the sidebar footer.
- Both user menus have the same items: name/email, My Tasks, Preferences, Logout.
- Neither nav links POA&M, Inventory, Component Definitions, Assessment Plans/Results, Parties, Roles, or Subject/Risk Templates. These were commented out on main as well, so this is not a regression.

## 2. Findings

### A-01 [P1] [broken] Editing a statement's ID silently detaches it (and its components) from the control tree

- URL: `/controls` (FedRAMP SSP active) → Access Control → AC-2 → AC-2_SMT → IMPLEMENT → EDIT STATEMENT
- Steps: in the Edit Statement drawer, change STATEMENT ID (I accidentally removed one character: `ac-2_smt` → `ac-2_sm`) and click SAVE.
- Observed: PUT succeeds with the toast "Statement updated successfully". The Implement drawer immediately flips to the "Create the statement record first… / Save this statement to add statement-level components" state. The existing "This System" by-component disappears from view and AC-2_SMT offers CREATE STATEMENT again. The API showed the statement now stored as `statement-id: "ac-2_sm"` with its by-component intact, so it is orphaned: it no longer matches any catalog part and cannot be reached from the UI. There is no warning, and the drawer also shows a stale "Save this statement…" hint next to a still-linked evidence filter.
- Expected: Statement ID should be read-only in edit mode (the UUID field already is), or at least validated against the control's statement parts with a warning.
- Evidence: `A-controls-statement-id-edit-orphans-statement.jpg`, `A-controls-edit-statement-stacked-drawer.jpg`. Code: `src/components/v2/system-security-plans/forms/StatementModalForm.vue`. In edit mode the STATEMENT ID `InputText` is editable and only checked for non-empty.
- Cleanup: I restored `statement-id` to `ac-2_smt` via the same PUT endpoint and verified that the uuid and by-components are unchanged.

### A-02 [P1] [broken] V2 Evidence Filters list has no Edit and no Create (regression vs main)

- URL: `/dashboards`
- Steps: open the list and inspect every card and the page header.
- Observed: each card offers only a trash icon (`Delete <name>`). There is no Edit (main's `FilterEditModal`), no Create button (main linked to `dashboards.create`), and no open/view affordance. Neither the title nor the chart is a link. `DashboardListView.vue` renders only `DashboardCompliancePostureSectionV2` and `DashboardSavedViewsSectionV2`, and neither wires up `FilterEditModal`. The only ways to create a filter are the Evidence page's "Save" or typing `/dashboards/create`. Editing a filter's query/controls is not possible anywhere in the UI.
- Expected: parity with main: Create in the header, plus Edit (and Open) per card, with delete secondary.
- Evidence: `A-dashboards-cards-delete-only.jpg`; `git show main:src/views/dashboard/IndexView.vue` (Create at L8–24, Edit at L179–186, FilterEditModal at L246).
- Old audit: A2-UX-EVID-06 is partly addressed (delete is de-emphasised and confirmed) but now delete is the only action.

### A-03 [P2] [navigation] Post-login landing is the V1 Evidence page, not the intended V2 landing (merge regression)

- URL: `/` after sign-in (also unauthenticated `/` → `/auth/login?next=/evidence`)
- Observed: sign-in lands on `/evidence` in the V1 shell. In `src/router/index.ts` the `home` route is `redirect: { name: 'evidence:index' }` but still carries `meta.uiVersion: 'v2'`, which is vestigial. Commit `eaee190 fix: post-login landing view` had pointed `/` at `dashboards-v2/DashboardListView.vue` with `uiVersion: 'v2'`. The merge `5b60e22 chore(ui): integrate main…` replaced that with main's redirect to Evidence. The dashboard-redesign handoff also requires "Home route `/` lands on dashboard, not Evidence". The forbidden-route fallback (`next({ name: 'home' })`) and the 404 "Go to home" link both lead to V1 Evidence as well.
- Expected: `/` resolves to the V2 landing (the Evidence Filters/dashboard view, or the workspace dashboard from the handoff), so a V2 sign-in leads into the V2 shell.
- Evidence: `A-post-login-landing-v1-evidence.jpg`; `git log -L26,33:src/router/index.ts`.

### A-04 [P2] [ux] Logout has no confirmation from either shell

- URL: V1 sidebar "Logout" (`/auth/logout`), V2 user menu "LOGOUT"
- Observed: `/auth/logout` (`auth-v2/LogoutView.vue`) posts the logout in `onMounted` and immediately routes to `/auth/login`. The V2 user menu calls `/api/auth/logout` directly. Neither shows a confirm step, and Escape/Cancel is never offered.
- Expected (login-process handoff §8, "Logout confirmation"): `/auth/logout` is a confirm page with Cancel as the default, and all entry points route through it.
- Old audit: A4-UX-EVID-07 is **still present**.

### A-05 [P2] [validation] Login: empty submit hits the API and reports "Invalid email or password" on the email field only

- URL: `/auth/login`
- Steps: click SIGN IN with both fields empty, then try a wrong password.
- Observed: both cases POST `/api/auth/login` → 401, and the same inline text "Invalid email or password" appears only under EMAIL. The fields are not `required`, have no `aria-invalid`, and there is no banner. Console shows a 401 resource error each time.
- Expected: client-side required checks for empty fields. For bad credentials, a form-level banner plus `aria-invalid` on both fields (handoff §8 "Password login").
- Evidence: `A-login-empty-submit.jpg`, `A-login-wrong-password.jpg`.

### A-06 [P2] [validation] Forgot password accepts an empty email and claims a reset link was sent

- URL: `/auth/forgot-password`
- Steps: click SEND RESET LINK with an empty field.
- Observed: an inline success panel ("Reset link sent. Check your inbox…") plus a duplicate toast "RESET LINK SENT". The page then auto-redirects to sign-in after a few seconds ("Redirecting to sign in in a few seconds", with a doubled "in").
- Expected: require an email before submitting. Anti-enumeration only applies to well-formed addresses. Show one success message, and don't auto-navigate away.
- Evidence: `A-forgot-empty-submit.jpg`.

### A-07 [P2] [state] Reset password with a missing or invalid token still shows the form

- URL: `/auth/password-reset` and `?token=bogus-uxpass`
- Observed: an info-blue (not error) banner says "appears invalid or expired. Please request a new link.", a red toast says "INVALID RESET LINK", and the full New/Confirm password form is still rendered with a disabled RESET button. There is no "Request a new link" action. The "KEEP HELP CONTACT SUPPORT" text is not a link.
- Expected (handoff §3 "Invalid Link" state): hide the form and show an error state with a primary "Request new link" action.
- Evidence: `A-reset-bad-token.jpg`.

### A-08 [P2] [a11y] Controls: tree chevrons are unnamed, there are no tree semantics, and drawers don't take focus

- URL: `/controls` (FedRAMP SSP)
- Observed:
  - Control and statement expand buttons are icon-only, with no `aria-label` and no `aria-expanded`; Tab announces them as "BUTTON". There is no `role=tree`/`treegrid`, and arrow keys do nothing. Group rows are whole-row buttons, which is good.
  - The OPEN REQUIREMENT and IMPLEMENT STATEMENT drawers render as `role="complementary"` with `aria-modal="true"`. Focus stays on the OPEN button behind the overlay, and Tab keeps walking the dimmed tree (AU-1_SMT, IMPLEMENT…) instead of the drawer. Escape does close the drawer, and focus is left on the trigger.
  - The Active SSP "Select System Security Plan" dialog has no `role=dialog`/`aria-modal`, and focus stays on `<body>` when it opens (Escape closes it).
- Expected: named toggle buttons with `aria-expanded`, a dialog role, and focus moved into and trapped inside drawers and dialogs.
- Evidence: `A-controls-drawer-keyboard-focus.jpg`, `A-active-ssp-select-dialog.jpg`.
- Old audit: A4-UX-EVID-04 is **partially fixed**: group rows are whole-row targets, but control and statement chevrons are still small and unlabeled.

### A-09 [P2] [dark-mode] Dark mode is force-disabled, but the V1 toggle is still shown and does nothing

- URL: any V1 page (bottom-right moon button "Toggle theme"); V2 pages have no toggle at all (`App.vue` hides it for `uiVersion: 'v2'`)
- Observed: clicking the toggle on `/evidence` leaves `<html>` without `.dark`. `src/composables/useTheme.ts` sets `FORCED_THEME = 'light'` (commit e9f7780), so every toggle resolves to light. Main has no forced theme, so dark mode worked there. V2 has Mocha dark tokens in `main.css` (`:root.dark`), but nothing can reach them.
- Expected: either restore dark mode (with a toggle in both shells, e.g. the V2 user menu) or remove the dead control.
- Evidence: `A-v1-theme-toggle-noop.jpg`.

### A-10 [P2] [navigation] V2 sidebar flattens the grouped nav into 18 numbered items without section headings

- URL: any V2 route
- Observed: the V1 groups (Systems, Workflows, Control Definitions, Admin) disappear, leaving one numbered list. Admin-only items (13–18) are mixed in with the core workspace. "06 Risk Register" vs "13 Risks", and "01 Active System" vs "02 Manage Systems", can't be told apart without the group context. At 1440×900 the list fills the sidebar, and long labels wrap ("WORKFLOW / DEFINITIONS").
- Expected: keep the group headings (as section labels in V2 style) or split admin into its own block.
- Evidence: `A-v2-shell-dashboards.jpg`.

### A-11 [P2] [responsive] V1 shell is unusable at 390px; V2 is usable

- URL: `/evidence` at 390×844 vs `/controls` and `/dashboards` at 390×844
- Observed: in V1 the fixed 320px sidebar stays open and leaves the content a 55px column (`main` x=320, width 55), with horizontal page overflow (scrollWidth 457). V2 collapses to a horizontally scrolling nav strip under the header, and the page content reflows.
- Expected: the V1 sidebar collapses or overlays on narrow screens. At minimum, V1 pages reached from the V2 shell should not break on mobile.
- Evidence: `A-mobile-v1-evidence.jpg`, `A-mobile-v2-controls.jpg`, `A-mobile-v2-dashboards.jpg`.

### A-12 [P2] [mixed-shell] The Evidence Filters feature bounces between shells

- URL: `/dashboards` (V2) → `/dashboards/create` (V1) → on submit → `/evidence?filter=…` (V1); `/dashboards/suggestions/:sspId` (V1); `/dashboards/:id` (V2)
- Observed: list in V2, create and suggestions in V1. After a successful create the user lands on Evidence instead of the list, with no confirmation toast (`CreateFormView.vue` `router.push({ name: 'evidence:index' })`).
- Expected: one shell per feature. After creating, return to the list (or the new filter) with a success toast.
- Evidence: `A-dashboards-create-empty-submit-v1.jpg`, `A-dashboards-suggestions-fedramp.jpg`.

### A-13 [P2] [validation] Evidence Filter create: empty submit fails silently

- URL: `/dashboards/create`
- Steps: click Submit with everything empty.
- Observed: `POST /api/filters` → 400 (`AxiosError` in console). No inline errors, no toast, no required markers, and the form just sits there.
- Expected: required markers and inline errors (Name, Result Filter), plus helper text for the filter syntax.
- Evidence: `A-dashboards-create-empty-submit-v1.jpg`.
- Old audit: A2-UX-EVID-07 is **still present**.

### A-14 [P2] [ux] Delete confirmation puts the default focus on DELETE ("ENTER TO DELETE")

- URL: `/dashboards`, trash icon on the "UXPASS dashboard A" card (created for this test, then deleted)
- Observed: the dialog "DELETE EVIDENCE FILTER… This cannot be reversed." opens with focus on the DELETE button and a footer hint "ESC TO CANCEL • ENTER TO DELETE". Delete then worked: `DELETE /api/filters/…` → 204, with the toast "EVIDENCE FILTER DELETED".
- Expected: the safe action (Cancel) focused by default for irreversible deletes.
- Evidence: `A-dashboards-delete-confirm-default-focus.jpg`.

### A-15 [P2] [copy] Controls drawers and inline statement detail show raw OSCAL parameter placeholders

- URL: `/controls` → AC-2 OPEN; AC-8 → AC-8_SMT expanded
- Observed: text such as "c. Require {{ insert: param, ac-02_odp.01 }} for group and role membership;" and "a. Display {{ insert: param, ac-08_odp.01 }} to users…". Every `_SMT` row reads "No statement description available.", and the inline detail starts with "No statement detail available."
- Expected: substitute parameter values (the SSP's set-parameters or the profile's), or at least render a labelled placeholder such as "[Assignment: …]". Hide the "no description" filler on statement roots that only have child parts.
- Evidence: `A-controls-open-drawer-raw-params.jpg`, `A-controls-statement-inline-detail.jpg`.

### A-16 [P3] [visual] OPEN REQUIREMENT drawer embeds V1-styled cards inside the V2 drawer

- URL: `/controls` → AC-2 → OPEN
- Observed: the statement list is a white, rounded, shadowed card with an Inter-style purple "Inherited" pill and unlabeled numeric badges ("1", "3"), all inside the flat Latte drawer. IDs are lowercase in the drawer (`ac-2`) but uppercase in the tree (`AC-2`).
- Evidence: `A-controls-open-drawer-raw-params.jpg`.

### A-17 [P3] [copy] Controls page copy and duplicate CTAs

- URL: `/controls`
- Observed:
  - The description "Tree-first workflow: expand groups, implement statements inline, and open drawers only when needed." reads like a design note, and implementation actually happens in drawers, not inline.
  - The eyebrow and the title both say "CONTROLS".
  - The no-SSP gate offers two primary actions (banner SELECT and OPEN SSP LIBRARY), although the handoff asks for one path.
  - Group evidence chips ("OK 76 / UNK 10 / ERR 34") count evidence records, while `/dashboards` Compliance Posture reports "0/664 controls satisfied" for the same SSP. Without units or a legend, the two pages appear to disagree.
- Evidence: `A-controls-no-ssp-gate.jpg`, `A-controls-fedramp-tree.jpg`, `A-v2-shell-dashboards.jpg`.

### A-18 [P3] [visual] Controls tree table scrolls horizontally at 1440 and wraps some rows inconsistently

- URL: `/controls`
- Observed: a horizontal scrollbar under the tree at 1440×900. Long titles (AC-14, AU-5, AU-6) drop below the ID chip while other rows stay inline.
- Evidence: `A-controls-search-no-results.jpg`, `A-controls-tree-expanded.jpg`.

### A-19 [P3] [a11y] Status filter chips have no pressed state for assistive tech, and rollups ignore the filter

- URL: `/controls`, "NEEDS EVIDENCE" chip
- Observed: the chip toggles visually (primary border) but has no `aria-pressed`. With the filter active, group rollups still read "2/69 STARTED" etc.

### A-20 [P3] [ux] Active SSP can be changed but not cleared; the picker hides profile status

- URL: V2 Active SSP indicator (SELECT/CHANGE)
- Observed:
  - Select and Change work, with a toast "ACTIVE SSP UPDATED" and a banner showing name, version and ID, and there is a no-matches state for searches.
  - There is no Clear/Unset action.
  - The picker list doesn't say which SSPs have a profile, so choosing "Enterprise Logging…" leads straight into the second gate.
  - The SSP detail page shows an "ACTIVE" badge and a "SET ACTIVE" button at the same time.
  - The active SSP (the full SSP document) persists in `localStorage.system` after logout.
- Evidence: `A-active-ssp-select-dialog.jpg`, `A-controls-no-profile-gate.jpg`.
- Old audit: A1-UX-EVID-02 is **partially fixed**.

### A-21 [P3] [state] `/dashboards/:id` ignores the id, and the suggestions page doesn't validate the SSP

- URL: `/dashboards/<existing id>`, `/dashboards/00000000-…`, `/dashboards/suggestions/not-a-real-ssp`
- Observed: both dashboard URLs render the full list, with no highlighted card and no not-found message for a bogus id (same as main). The suggestions page with a bogus SSP shows the generic subtitle "Selected SSP" plus "AI is not configured…", while the console logs a 400 from `/api/oscal/system-security-plans/not-a-real-ssp/full`. With the real FedRAMP id it shows the SSP title and the same AI-not-configured notice, so suggestions themselves could not be exercised (AI not configured). One first load of the FedRAMP suggestions URL rendered a blank page, which didn't reproduce (likely a dev-server chunk compile; unverified).

### A-22 [P3] [state] Evidence-filter mini charts show only dashes with no "no data" message

- URL: `/dashboards`, cards "Workflow: Technology Controls Governance…" and "Workflow: Asset Disposal…"
- Observed: the STATUS OVER TIME box shows 7 grey dashes with no axis, legend or "No evidence yet" text. Cards with data also have no axis or legend.
- Evidence: `A-dashboards-cards-delete-only.jpg`.
- Old audit: A2-UX-EVID-02 is **partially fixed** (a loading skeleton exists, but there is no explicit empty state).

### A-23 [P3] [copy] Naming drift: "Evidence Filters" vs "Dashboards"

- URL: `/dashboards`
- Observed: nav "07 EVIDENCE FILTERS", eyebrow "EVIDENCE", H1 "EVIDENCE FILTERS", section "DASHBOARDS / Findings grouped by query", delete dialog "Delete Evidence Filter", route `/dashboards`. The Active SSP banner sits above a list that is not scoped to that SSP (it shows posture for all SSPs and all filters), which suggests a scope that isn't there.

### A-24 [P3] [copy] Auth pages: link-styled text that isn't interactive

- URL: `/auth/login`, `/auth/forgot-password`, `/auth/password-reset`
- Observed: "DOCS", "SUPPORT", "GO TO RECOVERY" and "KEEP HELP CONTACT SUPPORT" are plain `<span>`s styled like links (cursor auto). "GO TO RECOVERY" duplicates the real "FORGOT PASSWORD?" link.
- Evidence: `A-login-default.jpg`.

### A-25 [P3] [ux] Auth edge cases

- Observed:
  - An authenticated user visiting `/auth/login` gets the sign-in form instead of a redirect.
  - The `?error=session_expired` notice says "Your SSO session expired before completing sign-in", which is SSO-specific copy for what the handoff intends as a general session expiry.
  - Code-only (not reproduced in the browser): the global 401 handler in `src/composables/axios/index.ts:71` pushes `{ name: 'login' }` without `next` or `error=session_expired`, so after expiry the user loses their place. The handoff requires both.
  - `?next=` is handled safely: `/controls` was honoured, and `//evil.example.com` fell back to home.
- Login banner: `LOGIN_BANNER` is empty in this environment (`/config.json` falls through to `defaultconfig.json`), so the banner is **unverified**.

### A-26 [P3] [visual] 404 page has no shell and V1 styling

- URL: `/this-does-not-exist-uxpass`
- Observed: a bare white page with "404 / Page not found. / Go to home" in Inter, plus the dead theme toggle. "Go to home" leads to V1 Evidence. There is no nav, so the user can't jump elsewhere.
- Evidence: `A-404.jpg`.

### A-27 [P3] [ux] V2 sandboxes are reachable in a normal build

- URL: `/__v2/components`, `/__v2/tokens`
- Observed: both render inside the full V2 shell for any authenticated user. No `import.meta.env.DEV` gate and no permission meta. They aren't linked from nav, but they are guessable and show demo forms ("Jane Doe", password field, validation demo). That's appropriate for migration QA, but they should be gated to dev builds or behind admin permission before release.
- Evidence: `A-v2-sandbox-components.jpg`.

## 3. What works well

- The V2 Controls gates are much better than in February. The no-SSP gate explains the prerequisite and links to `/system-security-plans?next=/controls`. The no-profile gate names the active SSP and links straight to its detail page, which has a PROFILE selector.
- The Active SSP banner in the V2 shell (name, version, ID, Change) has a searchable picker, a no-matches state and a confirmation toast. This resolves the February "where am I scoped" problem in V2.
- The Controls tree:
  - Group rows are whole-row toggles with rollups (STARTED x/y, components, OK/UNK/ERR).
  - Search auto-expands matches.
  - The no-results state reads "NO CONTROLS MATCH THE CURRENT FILTERS" with a CLEAR FILTERS button.
  - Controls without statement parts are flagged with a `NO STMT` chip (e.g. AC-2.10), as the handoff asked.
  - OPEN and IMPLEMENT are labelled text actions instead of an eye icon.
- The V2 auth shell is a clear two-column layout with labelled inputs (`id`, `type=email`, `autocomplete=current-password`). SSO providers are listed, and `next` is sanitised.
- The V2 shell at 390px degrades into a scrollable nav strip and a single column.
- Delete on Evidence Filters is a small icon behind a clear confirmation with a destructive-action callout, and shows a success toast.
- Nav labels and order are identical across shells and match main, so no destination was lost in the migration.
- The keyboard focus ring is visible on V2 nav items and the user menu (browser default outline). Escape closes the user menu, the SSP picker and the drawers.

## 4. Previously-audited issues (Feb 2026) in this area

| ID                                                    | Title                                             | Status                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-UX-EVID-01                                         | SSP gating copy/CTA inconsistent                  | Fixed for `/controls` (clear gate and CTA); other modules out of scope                                                                        |
| A1-UX-EVID-02                                         | Set flows: weak feedback, no unset                | Partially fixed: toast and Change exist; no clear/unset; SSP detail shows ACTIVE + SET ACTIVE together (A-20)                                 |
| A1-UX-EVID-03                                         | Active SSP not visible globally                   | Fixed in V2 shell (banner + Change); V1 shell shows text only, with no change action                                                          |
| A2-UX-EVID-02                                         | Charts/panels render blank                        | Partially fixed: skeleton while loading, but empty mini-charts are unexplained dashes (A-22)                                                  |
| A2-UX-EVID-06                                         | Dashboards list prioritises Delete                | Changed: Delete is de-emphasised and confirmed, but now it is the only action, with no Open/Edit/Create (A-02); confirm focuses DELETE (A-14) |
| A2-UX-EVID-07                                         | Dashboard create lacks validation                 | Still present (A-13)                                                                                                                          |
| A2-UX-EVID-08                                         | SSP context not shown on dashboards               | Fixed (V2 banner), though the list isn't actually SSP-scoped (A-23)                                                                           |
| A4-UX-EVID-01                                         | Controls blocked with only "SSP Page" link        | Fixed                                                                                                                                         |
| A4-UX-EVID-02                                         | No-profile gate unclear recovery                  | Fixed (names SSP, links to its profile selector)                                                                                              |
| A4-UX-EVID-03                                         | Landing reads empty until expand                  | Fixed (summary KPIs + group rows with rollups)                                                                                                |
| A4-UX-EVID-04                                         | Expand affordance easy to miss                    | Partially fixed: group rows fixed; control/statement chevrons small and unlabeled (A-08)                                                      |
| A4-UX-EVID-05                                         | Search unlabeled / misleading empty copy          | Fixed                                                                                                                                         |
| A4-UX-EVID-06                                         | Eye icon has no understandable outcome            | Fixed (labelled OPEN opens a drawer); drawer a11y issues remain (A-08)                                                                        |
| A4-UX-EVID-07                                         | Accidental logout via keyboard                    | Still present: no logout confirmation in either shell (A-04)                                                                                  |
| Handoff: dashboard-redesign "`/` lands on dashboard"  | Not met: `/` redirects to V1 Evidence (A-03)      |
| Handoff: login "session expired" redirect with `next` | Not met in code (A-25, not reproduced in browser) |

## Test data

- Created and then deleted the evidence filter "UXPASS dashboard A" (`POST /api/filters` 201, `DELETE` 204).
- AC-2_SMT `statement-id` was changed accidentally during A-01 and restored to `ac-2_smt` via PUT. I verified the uuid `4a2428eb-…` and by-component `eb710146-…` are intact.
- The active SSP was set in my browser session only (localStorage). No users, roles or auth settings were touched.
- Note: AC-1 and the AC group component counts changed (7→8, 11→12) between my runs. Another session was editing concurrently; this was not caused by this pass.
