# Browser UX pass: D-admin (control definitions, admin, long tail)

Run: 2026-10-10, headless Chromium at 1440×900 (mobile 390×844), logged in as admin@example.com.
Screenshots: `thread-storage/thr_yy6iaqjxfk/browser-pass/shots/D-*.jpg` (filenames are cited below without the path).
Console and network evidence came from `console`, `pageerror` and `response` (status ≥ 400) listeners registered before each navigation.

Dark mode could not be checked anywhere. The theme is hard-forced to light (`FORCED_THEME = 'light'` in `src/composables/useTheme.ts`), and adding `class="dark"` to `<html>` by hand changes nothing visible (see D-21).

## 1. Coverage

| Route                                                                                | Shell                                                | States checked                                                                                                          | # findings |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| /catalogs                                                                            | V1                                                   | list, empty tab (Internal Catalogs), delete-confirm dialog, mobile                                                      | 4          |
| /catalogs/:id                                                                        | V1                                                   | detail, group expanded, control inline, bogus id (redirect + toast), new empty catalog, mobile, forced dark             | 6          |
| /catalogs/new                                                                        | V1                                                   | empty submit, title only, non-UUID id (500), valid create, delete own UXPASS catalog                                    | 3          |
| /catalogs/:catalog/control/:id/evidence                                              | V1                                                   | loaded (broken)                                                                                                         | 1          |
| /profiles                                                                            | V1                                                   | list                                                                                                                    | 2          |
| /profiles/:id (+ /compliance, /json, /merge)                                         | V1                                                   | each tab, import expanded, bogus id                                                                                     | 4          |
| /profiles/create                                                                     | V1                                                   | form (empty submit not run, to avoid creating an undeletable record)                                                    | 1          |
| /profiles/build-props                                                                | V1                                                   | form                                                                                                                    | 1          |
| /component-definitions                                                               | V1                                                   | list, bogus id                                                                                                          | 2          |
| /component-definitions/:id (+ components, capabilities, back-matter, json)           | V1                                                   | each tab                                                                                                                | 2          |
| /component-definitions/create                                                        | V1                                                   | form                                                                                                                    | 1          |
| /assessment-plans                                                                    | V1                                                   | list                                                                                                                    | 3          |
| /assessment-plans/:id (+ tasks, json)                                                | V1                                                   | each tab                                                                                                                | 3          |
| /assessment-plans/create                                                             | V1                                                   | form                                                                                                                    | 1          |
| /assessment-results                                                                  | V1                                                   | list, "Set" clicked                                                                                                     | 3          |
| /assessment-results/:id (+ import-ap, results, local-definitions, back-matter, json) | V1                                                   | each tab                                                                                                                | 4          |
| /admin/import                                                                        | V1                                                   | idle/disabled state                                                                                                     | 1          |
| /admin/agents                                                                        | V1                                                   | empty state, Register dialog opened (not submitted). The Configuration tab could not be reached because no agent exists | 2          |
| /admin/notifications → /admin/diagnostics/notifications                              | V1                                                   | redirect, 4 sub-tabs                                                                                                    | 1          |
| /admin/diagnostics/ai-suggestions                                                    | V1                                                   | AI-not-configured state                                                                                                 | 1          |
| /admin/risk-templates                                                                | V1                                                   | list, create dialog (empty, invalid hint, valid), view, delete own UXPASS template, mobile                              | 4          |
| /admin/subject-templates                                                             | V1                                                   | list, search with no results                                                                                            | 1          |
| /admin/subject-templates/:id                                                         | V1                                                   | detail, bogus id                                                                                                        | 1          |
| /admin/risks                                                                         | V1                                                   | list                                                                                                                    | 1          |
| /admin/groups, /admin/groups/:id                                                     | V1                                                   | list, detail, bogus id                                                                                                  | 2          |
| /users, /users/:id                                                                   | V1                                                   | list, detail, bogus id, mobile                                                                                          | 4          |
| /roles                                                                               | V1                                                   | list                                                                                                                    | 2          |
| /parties                                                                             | V1                                                   | list                                                                                                                    | 2          |
| /preferences                                                                         | V1                                                   | default, channel dropdown open                                                                                          | 2          |
| /about                                                                               | V1                                                   | default                                                                                                                 | 1          |
| /auth/slack/callback                                                                 | V1_in_V2_shell (GuestV2Layout route, V1-styled view) | no params, `?status=error&code=invalid_state`                                                                           | 1          |

## 2. Findings

### D-01 [P1] [broken] Control evidence page renders an empty table though the API returns 60 records

- URL: `/catalogs/9b0c9c43-2722-4bbb-b132-13d34fb94d45/control/ac-2/evidence`
- Steps: Catalog detail → expand "Access Control" → on ac-2 (badge 38/5/17) click **Findings**.
- Observed: The page is titled "Control Evidence". The subheader shows just "-" because the control id and title are blank. The table has headers and no rows, and there is no empty or error message. A `pageerror` fires: `TypeError: Cannot read properties of null (reading 'filter')`. `GET /api/evidence/for-control/ac-2` returns 200 with `data.length = 60` and `metadata.control.title = "Account Management"` (checked with fetch from the same browser context). The button that opens the page says "Findings", but the page shows evidence.
- Expected: A list of the 60 evidence records, the control id and title in the header, and a matching button label ("Evidence").
- Evidence: `D-control-evidence-empty.jpg`, `D-catalog-group-expanded.jpg`. The view is `src/views/EvidenceByControlView.vue` → `EvidenceList`. A likely cause is a null `labels` or `filter` field in one record (unverified).

### D-02 [P1] [state] Assessment Results overview reports "Href N/A" and "0 result(s)" for an AR that has both

- URL: `/assessment-results/ec0dad37-54e0-40fd-a925-6d0bdea94c0d` (plus `/results`, `/import-ap`, `/json`)
- Steps: Open the IFA GoodRead AR. Compare Overview with the Results and JSON tabs.
- Observed: Overview shows Import Assessment Plan Href "N/A" and "This assessment contains **0** result(s)". The JSON tab shows `"import-ap": {"href": "./ap.oscal.xml"}`, and the Results tab lists one result ("IFA GoodRead Continous Monitoring Results June 2023"). The Import AP tab form is empty (Href `""`), so pressing "Update Import AP" would overwrite the real value with whatever the user types.
- Expected: The overview and the Import AP form show the stored values.
- Evidence: `D-ar-overview-wrong-counts.jpg`, `D-ar-results.jpg`. In code, the overview reads `assessmentResults.importAP?.href`, while the camelCased key from the API is `importAp`. It also counts `results` from the non-`/full` endpoint (`AssessmentResultsOverviewView.vue:98,126`, `AssessmentResultsEditorView.vue:117`).

### D-03 [P1] [ux] An admin can lock or delete their own account; Lock has no confirmation

- URL: `/users/2470883f-079d-4408-8ebb-3cc64c34fb25` (the logged-in admin)
- Steps: Open your own user record and inspect the footer buttons. They were not clicked; per the rules, users must not be changed.
- Observed: "Update User", "Lock User" and "Delete User" are all enabled (`disabled=false`) on the signed-in user's own record. In `src/views/users/UserView.vue`, `updateLock()` calls the API straight away with no `confirm.require` and no self-check. Delete has a confirm dialog but no self-check.
- Expected: Self-lock and self-delete are disabled or strongly guarded, and Lock asks for confirmation.
- Evidence: `D-user-detail.jpg`. The behaviour comes from reading the code and was not exercised.

### D-04 [P1] [responsive] The V1 shell is unusable at 390 px

- URLs: `/catalogs/:id`, `/admin/risk-templates`, `/users/:id`
- Steps: Set the viewport to 390×844. Then use "Toggle sidebar".
- Observed: The expanded sidebar covers about 80% of the width and the content is a sliver of clipped letters. Collapsed, the sidebar still takes about 95 px and shows cryptic abbreviations (S, EV, CON, CM, RIS, FIL, WF, CD, CAT, CL, PR, A, R, SU, G, A, DIAG, IMP). Two items both read "A". Tables are clipped: Risk Templates shows only the "Template Title" column, with no horizontal scroll. Labels on the user detail page wrap one word per line.
- Expected: An off-canvas nav on small screens, and tables that scroll or reflow into cards.
- Evidence: `D-mobile-catalog-detail.jpg`, `D-mobile-risk-templates-collapsed.jpg`, `D-mobile-user-detail.jpg`.

### D-05 [P2] [navigation] Ten admin and document pages are unreachable from the navigation

- URLs: `/component-definitions`, `/assessment-plans`, `/assessment-results`, `/admin/risk-templates`, `/admin/subject-templates`, `/roles`, `/parties`, plus `/profiles/:id/merge` and `/about`.
- Observed: These routes are absent from `src/config/navigation.ts`, which both the V1 sidebar and `useV2Navigation` use. The Admin group only lists Risks, System Users, Groups, Agents, Diagnostics and Import. No sidebar item is highlighted when you are on these pages (for example on `D-compdef-list.jpg`, `D-risk-templates-list.jpg` and `D-roles.jpg`, where "Control Definitions" is not active). Risk Templates is only linked from inside the risk create form.
- Expected: Every page has a home in the IA. The V2 migration needs an explicit place for "Documents" (CompDef/AP/AR) and "Templates".
- Evidence: `D-admin-import.jpg` (shows the expanded Admin group), `D-compdef-list.jpg`.

### D-06 [P2] [navigation] Profile detail tabs never show which tab is active; Merge is a hidden live route

- URL: `/profiles/512149a6-7f04-4c01-bb1b-78eafd6a950d` and `/compliance`, `/json`, `/merge`
- Observed: The Controls, Compliance and JSON tabs look identical on every sub-route. `ProfileView.vue` hard-codes `<Tabs value="main">`, which matches no tab. Only the link text inside each tab is clickable (`<Tab as="div">` wraps a `RouterLink`). `/merge` renders "Merge Settings" with "Save Merge Settings", but its tab is commented out, so the page is reachable only by URL.
- Expected: The active tab is highlighted, the whole tab is clickable, and Merge is either exposed or removed.
- Evidence: `D-profile-controls.jpg`, `D-profile-compliance.jpg`, `D-profile-merge-orphan.jpg`.

### D-07 [P2] [ux] Catalog control statements show raw parameter placeholders as one run-on paragraph

- URL: `/catalogs/9b0c9c43-2722-4bbb-b132-13d34fb94d45` (expand AC → Account Management)
- Observed: The statement renders as `a. Define and document … c. Require {{ insert: param, ac-02_odp.01 }} for group and role membership; d. Specify: 1. …` in a single paragraph. Parameters are not resolved or highlighted, and the lettered parts are not separated. Expanding a control does not change the URL, so a control cannot be linked or bookmarked.
- Expected: Parameters substituted or shown as labelled chips, parts structured as a list, and a deep link per control.
- Evidence: `D-catalog-control-inline.jpg`.

### D-08 [P2] [a11y] Catalog status badges are unlabelled, and controls are sorted as strings

- URL: same catalog, AC group
- Observed: The green/grey/red badges (38 / 5 / 17) have no title, aria-label or legend, so nothing explains what the numbers count (status of evidence? controls?). Controls are ordered ac-1, ac-13, ac-14, ac-2, ac-3 … ac-10, ac-11.
- Expected: A labelled badge or legend with accessible text, and natural sort order.
- Evidence: `D-catalog-group-expanded.jpg`. Checked the DOM: no `title` or `aria-label` on the badge or its four ancestors.

### D-09 [P2] [validation] Catalog create accepts a non-UUID ID and fails with a generic 500 message

- URL: `/catalogs/new`
- Steps: ID `not-a-uuid`, Title `UXPASS Catalog` → Create Catalog.
- Observed: Client validation passes. `POST /api/oscal/catalogs` returns **500**, and the form shows "An error occurred while creating the catalog." without saying which field is wrong. The ID is not pre-generated (profile and AP create pre-fill one). The generate button is an icon with only a `title`, no aria-label. The placeholder "Catalog UUID" is dark enough to read as a value, and turns red after a failed submit.
- Expected: Validate the UUID format inline (or auto-generate it), and show field-level server errors.
- Evidence: `D-catalog-create-bad-uuid.jpg`, `D-catalog-create-validation.jpg`. A valid create succeeded and redirected to the new catalog without a success toast, although delete does show one. I created and then deleted "UXPASS Catalog".

### D-10 [P2] [validation] The four OSCAL create forms work differently from each other

- URLs: `/catalogs/new`, `/profiles/create`, `/component-definitions/create`, `/assessment-plans/create`
- Observed:
  - Catalog: required asterisks, inline errors, a blank ID, and two Cancel buttons (header and footer).
  - Profile: ID pre-filled, no required markers, no client validation (`ProfileCreate.vue` only shows a toast on API error), no Cancel.
  - CompDef: ID blank, no required markers, no Cancel.
  - AP: ID pre-filled, Version pre-filled "1.0". Only "Import SSP URL" is marked required, and it is a free-text URL, not an SSP picker. Title is not marked.
  - Card widths differ (about 600, 680 and 455 px), and every primary button is a plain text button.
- Expected: One create-form pattern: the same ID handling, required markers, inline validation, Cancel placement and primary button style.
- Evidence: `D-catalog-create-validation.jpg`, `D-profile-create.jpg`, `D-compdef-create.jpg`, `D-ap-create.jpg`.

### D-11 [P2] [validation] Risk template form uses native bubbles, free-text enums and a backwards button emphasis

- URL: `/admin/risk-templates` → Create Template
- Observed:
  - An empty submit shows the browser's native "Please fill out this field." bubble, one field at a time. This differs from the inline errors on catalog and control forms.
  - Likelihood and Impact Hint are free text with placeholder "optional". Entering `not-a-level` produces the toast "Save Failed / invalid likelihoodHint", which names an internal field and gives no allowed values.
  - Cancel is an outlined button and Create is plain text, so Cancel looks like the primary action.
  - The read-only View dialog still shows required asterisks.
- Expected: A select for the enum fields, inline validation, and visual emphasis on the primary action.
- Evidence: `D-risk-template-create-validation.jpg`, `D-risk-template-invalid-hint.jpg`. Created, viewed and deleted "UXPASS Template"; the delete confirm worked.

### D-12 [P2] [ux] The AP JSON tab shows camelCase keys that differ from the downloaded file; the warning mentions editing that isn't possible

- URL: `/assessment-plans/1a58d031-b0ef-4e3a-9d6f-5c5969bb711e/json`
- Observed: The viewer shows `"assessmentAssets"`, `"assessmentPlatforms"` and `"assessmentSubjects"`. "Download JSON" decamelizes to kebab-case, so the file differs from what is shown. The AR, CompDef and Profile JSON tabs all show OSCAL kebab-case. A yellow warning says "Editing JSON directly can break the assessment plan structure…", but there is no Save (the save code is commented out). Tab labels vary: "JSON", "JSON View" and "Full Component Definition JSON".
- Expected: Show what will be downloaded (OSCAL kebab-case), and remove the editing warning or make the editor real.
- Evidence: `D-ap-json-camelcase.jpg`; `AssessmentPlanJSONView.vue:111` stringifies the camelCased response.

### D-13 [P2] [ux] "Set" on AP/AR lists gives weak feedback and has no unset (Feb A6-UX-EVID-01 / A1-UX-EVID-02: still present)

- URLs: `/assessment-results`, `/assessment-plans`
- Steps: Click **Set** on the FedRAMP SAR.
- Observed: A small "Active" badge appears after the title. The button still reads "Set", no toast appears, there is no unset, and nothing on the page explains what "Set" affects. Set is styled like JSON, so it sits as a third equal-weight row action.
- Expected: A stateful control ("Active" / "Make active" / "Clear"), a toast, and an explanation of where the active AP/AR is used.
- Evidence: `D-ar-list-set.jpg`, `D-ap-list.jpg`.

### D-14 [P2] [ux] Destructive actions sit inline with equal weight (Feb A6-UX-EVID-02: still present)

- URLs: `/catalogs`, `/catalogs/:id`, `/assessment-results/:id`, `/admin/risk-templates`
- Observed:
  - Catalog list rows have View / Deactivate / JSON / Delete. Deactivate has no confirmation (code not checked; not clicked, to protect seed data).
  - Catalog detail puts Delete in the header next to Edit, and also on every group row and every control row, beside Edit and "+ Control". That is five or six actions per row across about 20 groups and hundreds of controls.
  - The AR overview puts a red Delete next to a green Download JSON.
  - Confirmations exist, but their wording differs: catalog "Confirm Deletion / Confirm" versus risk template "Confirm Deletion / Delete".
- Expected: Destructive actions in an overflow menu, and consistent confirmation buttons labelled with the verb.
- Evidence: `D-catalogs-list.jpg`, `D-catalog-detail.jpg`, `D-ar-overview-wrong-counts.jpg`.

### D-15 [P2] [ux] List pages follow at least four different patterns (Feb A6-UX-EVID-05: still present)

- URLs: all list pages in scope
- Observed:
  - The Create button is top-right on Catalogs, Risk Templates, Subject Templates, Groups and Agents, but below the table on Profiles, CompDefs, AP, AR and Users.
  - Labels vary: "Create Catalog", "Create New Profile", "Create Assessment Plan", "Create New Assessment Results", "Create Template", "Register Agent", "Create User".
  - Profiles shows "Build Profile by Props" twice, under the H1 and again next to Create.
  - Subtitles are missing on Profiles, CompDefs, AP, AR and Users.
  - Header case varies: uppercase TITLE/ACTIONS, title-case "Template Title", and "FIRSTNAME"/"LASTNAME".
  - Only Subject Templates has search, filters and pagination; Risk Templates has none.
  - Subject Templates has no Delete, while Risk Templates does.
  - The page is titled "Users List" while the nav says "System Users".
  - Risk-template row actions wrap onto three lines.
- Expected: One list template: header with subtitle and a right-aligned primary CTA, a toolbar (search, filters), a table, and a consistent row-action menu.
- Evidence: `D-profiles-list.jpg`, `D-compdef-list.jpg`, `D-ap-list.jpg`, `D-risk-templates-list.jpg`, `D-subject-templates-list.jpg`.

### D-16 [P2] [ux] Detail-page headers, tabs and action zones differ on every document type (Feb A6-UX-EVID-03/04/07: still present)

- Observed:
  - Headers:
    - Catalog: H1 "Catalog" with the title as subtitle.
    - Profile: H1 is the title, with a bare UUID as subtitle (EVID-07).
    - CompDef and AP: H1 is the type, with the title as subtitle.
    - AR: H1 is the title, which wraps to two lines.
    - User: "Viewing user: Local Admin".
  - Tabs:
    - Profile: never shows an active tab (D-06).
    - CompDef and AP: large black text with a black underline.
    - AR: small text with a blue underline.
    - Diagnostics: nested tabs.
  - Action zones:
    - Catalog: text buttons in the header, wrapping to two rows.
    - CompDef: purple, blue and green buttons inside the Overview card.
    - AP: purple and blue buttons halfway down Overview.
    - AR: a footer bar with blue, green and red buttons.
    - Group: Edit/Delete top-right.
    - User: Update/Lock/Delete at the bottom.
- Expected: A shared detail-header component (type eyebrow, title, copyable ID, action group at top-right) and one tab component.
- Evidence: `D-catalog-detail.jpg`, `D-profile-controls.jpg`, `D-compdef-overview.jpg`, `D-ap-overview.jpg`, `D-ar-overview-wrong-counts.jpg`, `D-group-detail.jpg`, `D-user-detail.jpg`.

### D-17 [P2] [state] Not-found handling differs per page

- Steps: Open each detail route with the id `00000000-0000-4000-8000-0000000000ff`.
- Observed:
  - Catalog: redirects to `/catalogs` with the toast "Error loading catalog data / record not found".
  - Profile: redirects to `/profiles`, logs an uncaught `PAGEERROR: AxiosError … 404`, and sends duplicate requests to `/imports` and `/back-matter`.
  - CompDef, group and user: silently redirect to the list (user: two 404s).
  - Subject template: stays on the page with "Failed to load template." while **Edit Template** remains enabled.
- Expected: One not-found state that keeps the URL, says what is missing, and links back to the list.
- Evidence: `D-subject-template-bogus.jpg`, plus the console and network logs above.

### D-18 [P2] [copy] Admin Import: sections have no titles and disabled buttons are unexplained (Feb A6-UX-EVID-06: partially fixed)

- URL: `/admin/import`
- Observed:
  - There are now three cards, and each has a one-line description (improved since February).
  - Only the workflow card has a title ("Import workflows") and an "Admin" badge. The OSCAL and evidence-filter cards have no heading.
  - The page subtitle ("Import OSCAL content and evidence filters…") does not mention workflows.
  - Import and Clear buttons are disabled, with no hint such as "Select a file to enable".
  - Icons are mixed: a line upload icon in one card, the ☁️ emoji in the others.
- Expected: Titled cards, accepted formats per card, and an explanation of the disabled state.
- Evidence: `D-admin-import.jpg`.

### D-19 [P2] [state] Agents: empty states styled as warnings; Configuration tab not verifiable

- URL: `/admin/agents`
- Observed:
  - "No agents found…" and "Select or register an agent…" use amber warning callouts, which suggests something is wrong.
  - "Manage Keys" is disabled with no hint.
  - The seed data contains agent heartbeats, but this page lists none (it lists registered service-account agents). The page never explains the difference.
  - The Register dialog (Name\*, Description, Active) looks fine. It was not submitted.
  - The Configuration tab and config editor were not checked, because no agent exists and registering one is outside the allowed test data.
- Expected: Neutral empty states, and an explanation that heartbeat agents appear only after registration.
- Evidence: `D-admin-agents-empty.jpg`, `D-agent-register-dialog.jpg`.

### D-20 [P2] [state] Profile Controls and Compliance tabs give conflicting counts and opaque structure

- URL: `/profiles/512149a6-7f04-4c01-bb1b-78eafd6a950d`
- Observed:
  - Controls tab: "2 Imported Catalogs", both called "NIST Special Publication (SP) 800-53 revision 5", with nothing to tell them apart (no href or source). It reports 312 Included Controls.
  - Expanding an import shows only "Group 1" with Remove, Create Group and Save. The included controls are not listed.
  - Compliance tab: "664 total" controls, 0 satisfied, 8 not satisfied, 656 unknown. Meanwhile the catalog badge for ac-2 shows 38 satisfied.
- Expected: Counts that agree, or that explain their scope, and imports labelled by source.
- Evidence: `D-profile-controls.jpg`, `D-profile-import-editor.jpg`, `D-profile-compliance.jpg`. The root cause is unverified; it could be the duplicate import in the seed data.

### D-21 [P2] [dark-mode] The theme toggle is a dead control

- URL: every V1 page (bottom-right moon button)
- Observed: Clicking "Toggle theme" does nothing: `<html>` never gets `dark` and localStorage is untouched. `useTheme.ts` sets `FORCED_THEME = 'light'`. The tooltip still promises "Left click toggles theme. Right click matches system preference." Forcing `class="dark"` by hand also has no visible effect, so the `dark:` variants cannot be assessed.
- Expected: Hide the toggle while the theme is forced, or re-enable dark mode.
- Evidence: `D-catalog-detail.jpg` (forced-dark attempt gave an identical render; not saved separately).

### D-22 [P2] [state] The Slack callback gives no feedback without params; the error toast contradicts the page

- URL: `/auth/slack/callback`
- Observed:
  - Without params: immediate `router.replace` to `/preferences` with no query, no toast and no message. The "could not be validated" text is never visible.
  - With `?status=error&code=invalid_state`: toast "Slack Linking Failed / Slack linking failed (invalid_state). Please try again." The same page says "Slack linking is not configured for this environment", so retrying cannot work.
  - The callback view's spinner keeps spinning even in failure states (code).
  - Every Preferences load logs `404 GET /api/auth/slack/link/status`.
- Expected: A visible error state for invalid callbacks, and copy that matches whether Slack is configured.
- Evidence: `D-slack-callback-error-toast.jpg`.

### D-23 [P3] [copy] Preferences: misleading section title and unexplained disabled channels

- URL: `/preferences`
- Observed: The card heading is "Email Notifications", but each row is a multi-channel picker (Email, Slack). Both options are greyed out with no reason given (the providers are disabled in Diagnostics). The card is horizontally offset from the H1.
- Evidence: `D-preferences.jpg`, `D-preferences-channels-disabled.jpg`.

### D-24 [P3] [copy] /about is a scaffold placeholder

- URL: `/about`
- Observed: The only content is "This is an about page", vertically centred. The route has no `requiresAuth`.
- Evidence: `D-about.jpg`.

### D-25 [P3] [ux] Roles and Parties say "Administer" but are read-only flat lists

- URLs: `/roles`, `/parties`
- Observed: The subtitles say "Administer roles" and "Administer parties", but there are no actions, no search and no source column. Parties contains visible duplicates ("[SAMPLE]Person Name 1", "Cloud Service Provider (CSP) Name…", "FedRAMP JAB"). These are OSCAL roles, easy to confuse with the RBAC roles ("admin", Config-locked) on the user and group pages.
- Evidence: `D-roles.jpg`, `D-parties.jpg`.

### D-26 [P2] [navigation] Diagnostics nests "Diagnostics" inside "Diagnostics", and sub-tabs have no URLs

- URLs: `/admin/diagnostics/notifications`, `/admin/diagnostics/ai-suggestions`
- Observed:
  - Two stacked H1s ("Diagnostics", then "Notifications"), and a sub-tab that is also called "Diagnostics".
  - The Configuration, Health, Deliveries and Diagnostics sub-tabs do not change the URL.
  - Health repeats the email and slack warnings twice.
  - Deliveries uses internal jargon ("River notification jobs").
  - Opening ai-suggestions directly (AI not configured) shows a tab bar containing only "Notifications", with nothing active.
- Evidence: `D-diagnostics-notifications.jpg`, `D-diagnostics-ai-direct.jpg`, `D-diagnostics-subtab.jpg`.

### D-27 [P3] [visual] Admin Risks puts the trend chart above the page title

- URL: `/admin/risks`
- Observed: The "Risk Score Trend" card comes before the H1 "Admin Risk Register". The red residual line is hidden under the blue baseline because both values are equal.
- Evidence: `D-admin-risks.jpg`.

### D-28 [P3] [copy] Catalog titles show raw markdown

- URLs: `/catalogs`, `/profiles/build-props`
- Observed: "Sample Security Catalog \*for Demonstration\* and Testing" appears with the literal asterisks in the list, the delete dialog and the select options.
- Evidence: `D-catalogs-list.jpg`, `D-profile-build-props.jpg`.

### D-29 [P3] [ux] Build Profile by Props is pre-filled with demo values and uses three button styles

- URL: `/profiles/build-props`
- Observed:
  - The form loads pre-filled: Profile Title "Prop-Matched Profile", Version "1.0.0", a rule `label contains AC-`.
  - It has both a free-text "Catalog UUID" and a "Select Catalog" dropdown for the same value.
  - Buttons: red filled "Remove", slate "Add Rule", plain-text primary "Build Profile".
  - The page uses different horizontal padding from the other V1 pages.
- Evidence: `D-profile-build-props.jpg`.

### D-30 [P3] [state] Two AR tabs are "coming soon" placeholders, and a new catalog has no empty state

- URLs: `/assessment-results/:id/local-definitions` and `/back-matter` show "…management is coming soon". A newly created catalog shows only a divider line, with no "Add your first group/control" guidance.
- Evidence: `D-catalog-empty-new.jpg`; AR text captured in run logs.

### D-31 [P3] [ux] The catalog detail has no search or filter

- URL: `/catalogs/9b0c9c43-…` (NIST 800-53, 20 groups, more than 1,000 controls)
- Observed: The only way to find a control is to expand groups and scan. There is no search, filter or ID jump. The catalog list has category tabs (Standards, Policies, Procedures, Internal, Other), with a clean empty state on Internal ("No internal catalogs yet.").
- Evidence: `D-catalog-detail.jpg`.

## 3. What works well (keep)

- Delete confirmations exist on catalogs, risk templates, profile imports and users. Each names the record and says "cannot be undone". Success toasts follow ("Catalog deleted", "Template Deleted").
- Catalog and control dialogs have clear inline required-field errors ("ID is required", "Control ID is required").
- The Catalogs list has category tabs with counts and a good empty-tab message.
- Subject Templates has the most complete list pattern: search, type and source filters, pagination, a "No templates match the current filters" state, and a well-structured read-only detail page. Use it as the V2 list and detail baseline.
- The CompDef and AP overviews have useful summary counters, and the CompDef JSON tab has Download and Copy.
- Diagnostics → Notifications Health and Diagnostics show actionable, check-by-check readiness. The AI tab degrades gracefully with "AI is not configured…".
- The User detail Roles table shows origin and source ("Direct", "Config-locked") with the action disabled for locked roles.
- No `console.error` output or failed requests on the happy paths for catalogs, AP, AR, CompDef (apart from a 404 on `/characteristics` on Overview), admin, users or groups.

## 4. Previously audited issues (Feb 2026, this area)

| ID               | Issue                                                 | Status                                                                              | Notes                                                                    |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A6-UX-EVID-01    | "Set" feedback is subtle; label never changes         | still present (AP/AR)                                                               | D-13. The SSP list is out of scope for this group.                       |
| A1-UX-EVID-02    | Set flows: no clear selected state or unset           | still present (AP/AR)                                                               | D-13                                                                     |
| A6-UX-EVID-02    | Delete exposed as a primary row action (Catalogs)     | still present, and worse on catalog detail                                          | D-14. A confirm dialog does exist.                                       |
| Master report §5 | Destructive actions over-emphasized (Catalogs)        | still present                                                                       | D-14                                                                     |
| A6-UX-EVID-03    | Editor tab UI inconsistent (JSON vs JSON View)        | still present                                                                       | D-06, D-12, D-16                                                         |
| A6-UX-EVID-04    | Primary action placement differs between detail pages | still present                                                                       | D-16                                                                     |
| A6-UX-EVID-05    | Create CTA placement and wording inconsistent         | still present                                                                       | D-15                                                                     |
| A6-UX-EVID-06    | Import page duplicated, disabled states lack guidance | partially fixed                                                                     | D-18. Sections now described; no titles on two cards; no disabled hints. |
| A6-UX-EVID-07    | Raw UUID as prominent page metadata                   | still present on Profile; improved on CompDef and AP (moved into the metadata card) | D-16                                                                     |
