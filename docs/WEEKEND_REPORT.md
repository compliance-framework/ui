# Weekend report (2026-11-14 → 2026-11-16)

Autonomous migration work on `poc/redesign-foundation` while you were away. Each section is one
commit (or a few), with the decisions I made to keep moving. Nothing was pushed. The tracker in
`docs/REDESIGN.md` has the overall state; this file is the narrative and the calls to review.

How to read it: **Decision** lines are judgement calls you may want to reverse. **Gap** lines are
things a migrated page doesn't do yet. **Found** lines are bugs or oddities in the classic app or
the API that I noticed along the way.

## At a glance (read this first)

**Where it stands.** Every top-level page in the app now renders on the design-system frame
(AppShell, design-system title, actions, breadcrumbs and tabs). Nothing classic is reachable
without a redesigned page around it. Pages fall into three kinds:

- **Fully rebuilt** (design system end to end): Systems; Evidence (list, record, create, history);
  Compliance; Risks dashboard and register (system and cross-system); Workflow instances and
  definitions lists; the five OSCAL document lists and Catalogs; create and edit forms for
  systems, catalogs, profiles, component definitions, assessment plans and results, and POA&Ms;
  users, groups, parties and roles, and the user and group pages; system templates list; POA&M
  items; evidence filters list; control links (list and create); control evidence; My tasks;
  Inventory; Build a profile from props; subject templates (list and page); the profile page;
  the component definition, POA&M and assessment plan records (every tab, form and dialog);
  Preferences (with the Slack link); the system template page; New evidence filter (and the
  edit dialog); Import; About; and every signed-out page.
- **Classic islands**: none left. Diagnostics and the agent Configuration tab were the last.

App-wide pieces are design-system too: **toasts, confirmations and the error dialog** (the
app's `useToast()` and `useConfirm()` now come from `src/ds`; PrimeVue, Volt and Tailwind
are gone). The third live sweep (97 routes, including every record tab and Configure
section) is clean apart from known API errors. Most record forms are design-system now too (task,
POA&M item, observation, finding, back matter and local definitions, capability, component,
component definition back matter, system user, leveraged authorization, system component, export
offering, inventory edit, workflow step), each written
as one add-and-edit form. The e2e axe run now also covers the OSCAL record
tabs, the Configure System sections, the user and group pages, Inventory, Build a profile, the
catalog page, subject templates and the system template page.

No classic islands are left (`docs/REDESIGN.md` → Legacy islands); per-page notes are below.

**Decisions most worth your review**

1. Islands, page first (see the first log entry): structure everywhere first, deep editors
   later.
2. Configure System and the SSP Editor merged into one page; old SSP-editor links now switch the
   current system.
3. Shared building blocks instead of per-page copies: one list screen for five document types,
   one create/edit form for seven document types, `useListView` for URL search and sort.
4. The cross-system risk register is the system register in a global mode, not a second page.
5. New design-system pieces: `Combobox` (filterable picker), `GuestTemplate`, `ToastRegion`
   (bridging PrimeVue's toast bus; errors now stay until dismissed), `ConfirmHost` (bridging
   PrimeVue's confirm bus), query-based `Tabs`, optional search in `FilterBar`, `disabledReason`
   on checkbox options.
6. Several "toast after submit" and `window.prompt()` flows became inline field errors and
   design-system dialogs (sign-in, password reset, cancel a run, all new forms).
7. Header-only migration for the big admin pages (`embedded` prop), so their large specs run
   unchanged; their primary actions are still classic buttons in the body.
8. A shared `RecordCollection` for "entries inside a record" (POA&M items, observations, risks,
   findings; SSP users and leveraged authorizations), configured per kind like the document
   forms.
9. Assigning workflow roles is per role (menu, then a filterable person picker) instead of one
   dialog for every role. Assessment results lost their View and Edit buttons, which led to
   routes that never existed.
10. `useApiQuery` now treats `{"data": null}` as empty and accepts reactive URLs; `FileField`
    takes several files with `multiple`. Small design-system changes, worth a look.
11. Permission-gated actions are shown disabled with a reason throughout, where classic pages hid
    them.

**Bugs found that probably affect `main` too** (worth tickets)

- `PUT /api/oscal/component-definitions/:id` returns 200 but stores nothing (API).
- Editing assessment results always fails: the plain GET returns `results: null`, the edit page
  sent `results: []`, and the API rejects that (classic UI; fixed here by loading `/full`).
- The workflow definitions status filter never re-fetched; the definitions API returns no
  `status` and snake_case `suggested_cadence`/`step_count` (UI and API).
- The Compliance page read `uuid` from SSP profiles, but the API returns `id` (from before the
  weekend).
- `SystemSecurityPlanDiagramsView` ignored its `sspId` prop; `inventory:index` was defined twice.
- `PUT` aside, the API rejects POA&Ms and assessment plans without a version;
  `GET /profiles/:id/merge` returns 500; one Control Implementation component GET returns 500.
- User lookups sent role and group names (e.g. `it-iam`) to `GET /api/users/:id` (classic UI;
  fixed here).
- The profile Controls tab never resolved its imports' catalogs when the back matter loaded after
  the imports (a race), so every control group requested `catalogs/undefined` (classic UI; fixed
  here).
- The global PrimeVue toast fails axe colour contrast; the classic `FilterForm` has unlabelled
  inputs.
- Creating a POA&M observation without a Collected date failed with "Invalid time value"
  (classic form; fixed here). Adding the first back matter resource to a POA&M returns 500
  (API); the POA&M back matter tab now creates an empty back matter first, which avoids it.
  The POA&M back matter and local definitions endpoints answer 404 when empty, and the classic
  back matter page showed that as an error.
- Assessment results' classic View/Edit result buttons linked to routes that never existed.
- Saving an assessment plan task with a date schedule failed: the classic timing editor sent bare
  dates and the API wants RFC 3339 timestamps (classic UI; fixed in the new task form).
- Adding a component definition back matter resource never saved: the API's `POST
.../back-matter` replaces the whole back matter and expects `{resources: [...]}`, but the
  classic form sent a single resource (answered 200, stored nothing). Fixed in the new form,
  which sends the existing resources plus the new one.
- Editing a POA&M observation showed its Collected and Expires times blank (an ISO timestamp in a
  local datetime field) and sent the field's raw value back (classic UI; fixed in the new
  observation form).
- The classic POA&M finding form never saved a target or status: its target JSON field was
  commented out (an empty target was sent) and its required Status was never sent (classic UI;
  fixed in the new finding form).
- On Implementation, the control drawer's Edit and Delete for a component statement never saved
  (no handlers), and the drawer showed "Components (0)" for controls whose statements live on
  the requirement's statements, which is nearly all of them (classic UI; both fixed here).
- The evidence filter form couldn't link a control that has enhancements (e.g. AC-2, only
  AC-2(1) and so on), an invalid filter expression made Submit do nothing (only logged), and a
  failed create on New evidence filter was only logged (classic UI; all fixed in the new form).
- On a risk's Mitigation Plan tab, adding or editing a task never saved: the task dialog emitted
  its result and the tasks panel never listened (classic UI; fixed here).

**A regression of mine, fixed:** after the Configure/SSP-editor merge, the Users and Leveraged
Authorizations sections looked empty (their classic wrappers read only `:id`). Found by the
Configure sweep and fixed in `getIdFromRoute`; worth a second look at the other hidden
sections.

**Options for you to choose from (next phase)**

- **A. Replace islands by traffic:** risk page body, then Configure System sections, then
  record tabs. Highest user impact, biggest pieces first.
- **B. Primitives first, then sweep:** build the few missing design-system pieces the islands
  need (toast, tree, JSON/code viewer for the record JSON tabs, a key/value editor), then
  replace islands quickly, smallest first. Steadier progress, and it removes PrimeVue sooner.
- **C. Prepare to merge:** freeze scope, rebase onto `main`, and harden what's here (axe on
  island pages, CI for `lint:css` and `test:e2e`) so the branch can land, with islands replaced
  afterwards on `main`.

My recommendation is **B then C**: the islands share a handful of patterns, so building those
primitives once makes the rest fast, and merging sooner reduces the conflict cost of the big
bang.

**Test data I created in local-dev:** a group "Weekend test group", a user
`weekend.test2@example.com` (renamed "Weekend2 Tester"), a component definition "Weekend
test CD", a profile "Weekend version probe" (the API can't delete those), a POA&M "Weekend test
POA&M" with an observation "Weekend observation", and assessment results "Weekend test AR"
with one result. Later: on Payments Processing Platform, three "Weekend offering" export
offerings and two "Weekend inventory item"s; a global evidence filter "Weekend filter" linked to
INT-CI; a revoked key "Weekend key" on the todo-worker agent. The seed `it-ops` role assignment on "Annual DR Exercise — Customer Portal"
was removed and re-created (same values, new ID). Every other record I created was deleted again.

**How to look:** `VITE_API_PROXY=http://localhost:8080 npm run dev`, sign in, and click
through the nav. `make reviewable`, `npm run build` and `npm run test:e2e` all pass at the head
of the branch.

## Starting point

Done before the weekend: app shell and nav, Systems list, Evidence (global and system, record,
create, re-submit, history), Compliance, Workflow Instances list, Risks dashboard and register,
create risk from evidence.

## Log

### Approach for the big pages: legacy islands (the main decision of the weekend)

**Decision:** pages whose editors run to thousands of lines (Implementation ~6k, Configure
System, risk detail ~4.4k) are migrated _page-first_: the page frame, navigation, lists, read
views and simple forms move to the design system, and the deep editors are embedded as **legacy
islands** (classic components inside `LegacyPage`). Where a classic page's script is mostly data
logic, I keep that script verbatim and replace only its template, so behaviour stays identical
and its existing tests can be pointed at the new screen. This lets the whole UI move to the new
structure this weekend, with a clear list of islands to replace afterwards
(`docs/REDESIGN.md` → Legacy islands). If you'd rather have fewer pages fully rebuilt than every
page structurally migrated, say so and I'll switch.

### Implementation (`/systems/:id/implementation`)

- Frame, profile picker, control tree (catalog groups as disclosures, search), per-control row
  (counts, open risks link, suggestions, Details) and the drawer are on the design system.
- **Decision:** the classic page's 1,100-line script is reused as is; its 15 tests were pointed at
  the new screen and adapted (selectors only, plus one test rewritten for the new Details
  behaviour). All pass.
- **Decision:** the profile picker is rebuilt as checkboxes in a disclosure (saving on change, as
  before) rather than a multi-select; the attached profiles are listed above it.
- **Decision:** a control with suggestions but no implementation has an enabled **Details**
  button and a "N suggestions" note, replacing the classic separate suggestion badge.
- **Update: no islands left.** The statement editor, evidence counter, component statements,
  suggestions and export dialog were rebuilt earlier; now the drawer's Shared responsibility
  panel (Provides, Inherits, Satisfies, Legacy, Available to import, and the import dialog), each
  component statement's provided, left-to-importers and inherited lists, and the statement
  editor's Inherited responsibilities (satisfaction, drift with Re-attest, "How we handle this",
  linked evidence filters with link and create) are design-system too. The page joins the axe
  checks. Their classic specs are ported (stubs only; every case kept). Checked live: the panel
  renders in the drawer with no page errors. Local-dev has no exports or leverage links, so the
  populated states are checked by the specs only. **Decisions:** badges use the shared status
  vocabulary (satisfaction as Implemented/Action needed, link status as Active/Drifted/Revoked,
  posture as Covered/Not covered/No evidence yet); the inherited section's heading tooltip pointed
  at a tooltip key that didn't exist, so it is a caption instead; without update access the "How
  we handle this" field is read-only rather than editable with no Save. Three classic export
  editors left unused by the Control Implementation retirement are deleted.

### Configure System and the SSP Editor (`/systems/:id/configure/...`)

- **Decision:** Configure System (by current system) and the SSP Editor (by `:id`) showed the same
  sections, so they are now **one page** at `/systems/:id/configure/<section>`. Every old URL
  redirects: `/system/...` for the current system, `/system-security-plans/:id/...` for that
  system. The SSP editor's Risks and Compliance tabs lead to This System's Risks register and
  Compliance pages.
- **Decision (behaviour change):** opening an old SSP-editor link now makes that system the
  current system (like every URL-scoped page), where the classic editor browsed an SSP without
  switching. I think that's right for shareable links, but it's a change.
- **Decision:** classic risk detail keeps its SSP-scoped URL as a standalone page until it is
  migrated, since its parent (the SSP editor) is gone.
- **Gap (islands):** every section's content is still the classic SSP view; the tabs, header
  and routing are new. Hidden sections (System Implementation, Users, Leveraged Authorizations,
  Control Implementation, Export Offerings, Leverage, Inherited Capabilities) stay reachable by
  link but not as tabs, as before.
- **Found:** the classic `SystemSecurityPlanDiagramsView` ignored the `sspId` it was given and
  only read `:id` from the URL; it now takes the prop first (fixes 400s with `undefined`).
- Deleted: the classic Configure System frame and its 13 wrappers, the SSP editor frame, the
  classic Risks view and dashboard widgets, and the classic SSP Compliance view (all now unused).
- **Decision:** with every This System page URL-scoped, the router test now checks that each
  This System nav item's route takes `:systemId`.

### Record pages: one design-system frame for all seven

- **Decision:** the seven classic "editor" pages with tabs (workflow definition, workflow
  instance, profile, component definition, assessment plan, POA&M, assessment results) now share
  the mockup's `RecordTemplate` (title as the only h1, status, actions, route tabs). Each keeps
  its classic script (loading, actions such as Activate / Run now) and its URLs; the tab contents
  are classic islands.
- **Decision:** tab labels use sentence case ("Role assignments", "Back matter"), and "Executions"
  on a workflow instance is now "Runs", matching the Run now button.
- **Decision:** a workflow instance that fails to load stays on its page with an error, where
  the classic page bounced to the instances list.
- **Gap:** assessment plans, POA&Ms and assessment results have no records in local-dev, so
  those three frames are verified by type-check and build only, not in a browser.

### Document lists: one screen for five lists

- Profiles, component definitions, assessment plans, assessment results and POA&Ms now share one
  list screen (`src/screens/documents/`), configured per type in `documentKinds.ts`: title,
  version and last modified, title search and sort in the URL, a Create button, and each row
  links to its record.
- **Decision:** the classic "Set" button on assessment plans, results and POA&Ms is now **Make
  active** in each row's menu, and the active one carries an **Active** tag (like "Current" on
  Systems). Full-JSON download moved into the same menu as **Download source (JSON)**, as on
  Systems. Profiles had neither, so its rows have no menu; "Build profile from props" is a page
  action.
- **Decision:** every list shows Version and Last modified, where the classic profile, component
  definition and assessment plan lists showed only the title.
- Classic list views deleted. Catalogs is different enough (category tabs, activate, delete) to
  get its own screen next.
- e2e: the five lists are in the axe checks. The "every route" axe test now scales its timeout
  with the number of routes, since it was hitting the 30s default.

### Catalogs list (`/catalogs`)

- Type tabs as before (Standards, Policies, Procedures, Internal catalogs, Other), now with the
  tab in the URL (`?type=policy`), plus title search and sort. Tab counts follow the search.
- **Decision:** Activate/Deactivate, Download and Delete moved from row buttons into the row
  menu; Delete confirms with the design-system dialog. Inactive catalogs keep their
  **Inactive** tag.
- **Decision (design system):** route-bound `Tabs` now also select tabs that differ only by
  query: the tab whose query values all match the URL wins, most specific first, so a tab with no
  query is the default. This makes query tabs available to other lists.

### Shared list view, and the admin lists (users, groups, parties, roles)

- **Decision:** the URL search-and-sort logic every simple list repeats is now one composable,
  `src/screens/listView.ts` (`useListView`, `matches`). The document lists and Catalogs use it;
  Systems, Evidence and the risk register keep their own (more filters).
- Users: name, email, last sign-in; Locked and Inactive tags; search by name or email. **New
  user** is a design-system dialog with inline validation (email shape, required names, matching
  passwords) instead of a toast after submit.
- Groups: name, description, members (sortable). **Decision:** creating a group opens it, since
  a group does nothing until it has members and roles (the classic page stayed on the list).
- Parties and Roles: the classic pages were collapsible lists showing name and remarks; they're
  now searchable read-only tables (parties also show type and email).
- **Found:** local-dev has no roles (`GET /api/oscal/roles` returns `[]`), so Roles shows its
  empty state there.
- Live testing created a group "Weekend test group" and a user `weekend.test2@example.com` in
  local-dev. Delete them if they get in the way.

### Workflow definitions, cross-system risks, POA&M items, system templates

- **Workflow definitions** (`/workflows`): search, status and sort in the URL; **New definition**
  is a design-system dialog (inline validation, then opens the new definition); Delete in the row
  menu with a confirm.
  - **Found:** the classic status filter never re-fetched, so it did nothing. Also, the
    definitions API returns no `status` field at all (and returns `suggested_cadence` and
    `step_count` in snake_case, unlike the rest of the payload).
  - **Decision:** the Status column and filter appear only when some definition has a status, so
    today they're hidden rather than showing a blank badge on every row.
- **Cross-system risks** (`/admin/risks`): **Decision:** rather than a second register, the
  This System register now has a global mode. At `/admin/risks` it reads `/api/risks`, adds a
  System column and a System filter (`?system=`), drops the Dashboard/Register tabs, and lets New
  risk choose the system. Risk links from it don't carry `from=system`, so the detail page's
  Back doesn't jump into one system. The classic `RiskRegisterPanel` and `RiskTrendWidget` are
  deleted, as nothing else used them.
  - **Gap:** the classic global page had a risk trend chart; it isn't rebuilt (the system
    Risks dashboard has the trend view).
- **POA&M items** (`/poam-items`, not in the nav, in the classic app either): system and status
  filters, title search, newest first. **Decision:** the classic free-text SSP ID, risk ID and
  "deadline before" (typed ISO timestamp) filters became a System select. Risk ID and deadline
  filters are dropped; say if anyone used them.
- **System templates** (`/admin/ssp-templates` and `/:id`): list and record on the design
  system; the classic specs were ported. **Gap (islands):** the create/edit form dialog, the
  preview panel and the created-systems table are classic.
- **Decision (shared):** `useListView` takes a default sort direction, so lists sorted by date
  default to newest first without putting `dir` in the URL.

### Signed-out pages: sign in, forgot and reset password, SSO and Slack callbacks, sign out

- New design-system **`GuestTemplate`**: the CCF mark above one centred panel with the page's
  h1. The classic `GuestLayout` is gone (the `/auth` route renders a bare `RouterView`). Each
  page keeps its classic script (the template-transplant approach), so the sign-in, SSO,
  banner-dismissal and redirect logic are unchanged and the classic specs were ported.
- **Decision:** a failed sign-in is explained above the form ("Those details don't match an
  account…") instead of a "Login Failed" toast. The reset page explains a bad link inline and no
  longer also toasts it. Its rules now show as field errors after submit, instead of a
  silently disabled button.
- **Decision:** SSO buttons are plain "Continue with Google" buttons; the classic provider logos
  and initials badges are dropped (third-party images of arbitrary size). Easy to bring back as
  a small design-system component if you want them.
- **Decision:** the configurable sign-in banner is a design-system message with a Dismiss
  button; its `warn` severity maps to the warning tone.
- **Found:** guest pages render outside AppShell, so they had no reka `TooltipProvider`; the
  template now provides one.
- **Found (to-do):** the global PrimeVue toast fails axe colour contrast (`.text-base`). It's
  the one PrimeVue piece the redesign still uses everywhere, and worth replacing with a
  design-system toast next.
- e2e: a new axe test covers the signed-out pages in both themes, with an SSO provider and a
  configured banner.

### Evidence filters (`/dashboards`)

- List with search, Scope (any, Global or a system), Control and Component filters, all in the
  URL (the classic ones reset on reload). Each filter's name opens **its evidence**: the system's
  Evidence page for a system filter, the global one otherwise. "Follows scope" and "Automatic"
  are tags.
- **Decision:** the classic page expanded a row inline to show its chart. It's now **Show
  trend** in the row menu, opening a drawer with the design-system line chart (same data as the
  Evidence page's trend), the filter expression and "Open its evidence".
- **Decision:** `/dashboards/:id` rendered the whole list and ignored the id; it now redirects
  to the list.
- **Gap (islands):** the create and edit form (`FilterForm`, 468 lines) is classic, inside a
  design-system page for New filter and in the classic dialog for Edit. Suggestions
  (`/dashboards/suggestions/:sspId`) is still classic.
- **Found:** the classic `FilterForm` fails axe (inputs without labels). New filter is left out
  of the axe checks until the form is rebuilt, like the other island-heavy pages.

### User and group pages, My tasks, About

- **User** (`/users/:id`): name as the h1, Locked/Inactive tags, **Edit**, **Lock/Unlock** and
  **Delete** as page actions (delete confirms with the design-system dialog), account details
  as a description list, sign-in attributes as a code block, and groups as tags, with "(from
  SSO)" on inherited ones. Edit is a design-system dialog (first and last name; email can't
  change). **Gap (island):** the roles panel is classic.
- **Group** (`/admin/groups/:id`): Edit (the New group dialog, now `GroupFormDialog`, doing both)
  and Delete. **Gap (islands):** the members and roles panels are classic. User and group pages
  are left out of the axe checks because of those panels (grey-text contrast, heading order).
- **Decision:** the classic user and group pages bounced to the list when they failed to load;
  they now stay put with an error and Retry, like every other record page.
- **My tasks**: the classic script is kept; tasks are a table (step, workflow, status, due, with
  a Late tag), and Open and Reassign are in the row menu (Reassign explains when a step can't be
  reassigned). **Gap (island):** the step panel is classic. **Decision (design system):**
  `FilterBar` can now omit its search box (`searchLabel` is optional), since My tasks has
  filters but no text search.
- **About**: the classic page said "This is an about page"; it now has a short description and
  a GitHub link. Nothing links to it yet.
- **Found:** my route-meta helper had put `ds: true` on the wrong route once (About has no
  `meta`). I fixed it and checked every route: nothing outside `src/screens` is marked as
  redesigned.

### Create and edit forms for component definitions, profiles, assessment plans, POA&Ms

- **Decision:** the seven classic create and edit pages (each its own copy of ID, Title,
  Version, Remarks) are now **one configurable form screen** (`src/screens/documents/
DocumentFormScreen.vue`, configured in `formKinds.ts`). Errors show next to their fields
  (title required; an assessment plan's SSP URL required and well-formed) instead of toasts.
  Edit loads the whole document and sends it back with the changed fields, as before.
- **Found (API bug):** `PUT /api/oscal/component-definitions/:id` returns 200 and echoes the
  body but stores nothing (checked in local-dev: title and remarks changes don't persist). That's
  presumably why the classic "Edit component definition" page was read-only. **Decision:** that
  route now redirects to the definition's overview, which shows the same details. POA&M and
  assessment plan PUTs do persist (checked with throwaway records, then deleted).
- **Decision:** a new document's ID is the generated UUID in a full-width field with a "Generate
  a new ID" button under it (the classic page had an icon-only button glued to the input).
- Live testing created a component definition "Weekend test CD" in local-dev. The API has no
  delete for component definitions, so it's still there.
- Follow-up: **New system** and **New catalog** use the same form. A new system still becomes
  the current system (and joins the system switcher's list), then opens in Configure System; a
  catalog's Type is still stored as the `catalog-type` prop. The classic system-create specs were
  ported to the shared form's spec.
- Follow-up: **assessment results** create and edit use the shared form too: import AP
  reference (required) and, on create, the first result's title (required) and description.
  - **Found (classic bug):** editing assessment results always failed. The plain
    `GET /assessment-results/:id` returns `results: null`, the classic page sent `results: []`,
    and the API rejects that ("at least one result is required"). The new form loads
    `/:id/full` for editing and sends that back, which works and keeps the results (checked with
    a throwaway record, then deleted).

### Catalog page and control evidence

- **Catalog** (`/catalogs/:id`): title as the h1, an Inactive tag, and Add control, Add group,
  Edit, Activate/Deactivate and Delete as page actions; it says when the catalog is empty. **Gap
  (islands):** the group and control tree (`CatalogGroup`/`CatalogControl`, recursive) and the
  add, edit and delete dialogs are classic.
- **Decision:** AppShell kept the classic catalog page alive (`KeepAlive include="CatalogView"`)
  so its open groups survive a visit to a control and back. The KeepAlive now wraps the
  redesigned branch for `CatalogScreen`, and the legacy branch no longer has one (nothing else
  used it).
- **Control evidence** (`/catalogs/:catalog/control/:id/evidence`): a design-system table
  (status, evidence linked to its record, last seen) with a breadcrumb back to the catalog,
  replacing the classic `EvidenceList` (now deleted). The classic spec's case (the endpoint
  returns `labels: null`) is kept.

### Control links, and a design-system Combobox

- **Control links** (`/control-links`): individual and catalog links as query tabs
  (`?view=catalog`), relationship as a tag, Delete and Re-sync in the row menu. Deleting still
  confirms in the classic PrimeVue dialog (via `useControlLinkDelete`). **Gap:** worth moving
  to the design-system confirm when the composable is next touched.
- **New control link**: scope as a radio group, then source, relationship and target in panel
  sections. Errors show by each field ("Choose the source catalog.", "A control can't be linked
  to itself.").
- **Decision (design system): new `Combobox`** (`src/ds/components/Combobox`). The classic form
  used PrimeVue's filterable selects, and a catalog can have hundreds of controls, so a native
  select wouldn't do. The Combobox is built on reka-ui's: type to filter by label or ID, arrow
  keys and Enter to choose, it shows the chosen label, it restores the chosen label if you leave
  without choosing (only listed values can be picked), and it caps the list at 100 with "Type to
  narrow". It reuses TextCompletion's portal targeting, so it works inside dialogs. Checked live
  with mouse and keyboard. It should also suit the other control pickers still in classic
  islands.
- **Found (mine):** the user page's axe failure included a heading-order issue I'd blamed on
  its classic islands. It was my own panel sections (h3 straight after the h1). Fixed there and
  on New control link.

### Compliance Map (`/lineage`)

- **Decision:** the tree and graph were two sibling pages, each with its own header and a
  Tree/Graph toggle. They're now children of one design-system frame (`LineageScreen`: title,
  description, Tree and Graph as route tabs). The URLs and route names (`lineage`,
  `lineage-graph`) are unchanged. The classic views lost only their headers; the graph keeps its
  "worst N nodes" explanation.
- **Gap (islands):** the tree, graph, scope bar and node drawer are classic, so the page isn't
  in the axe checks.

### Workflow run page (`/workflow-executions/:id`)

- Title (the instance's name) with the run's status badge, its dates as facts, a breadcrumb to
  the instance's Runs tab, the failure reason as an error message, and step counts as a
  description list. Actions: View evidence stream, Retry run, Cancel run.
- **Decision:** cancelling asked for a reason with the browser's `window.prompt()`; it's now a
  design-system confirm with a required Reason field ("Keep running" / "Cancel run").
- **Decision:** a run that fails to load stays put with Retry, instead of offering a link to a
  classic instances route.
- **Gap (islands):** execution metrics, the step graph, the step list and the step panel are
  classic. Not in the axe checks for that reason.

### Preferences (`/preferences`)

- Each notification (evidence digest, task available, daily task digest, risk notifications) is
  a panel section with a checkbox per channel (Email, Slack), saved on change as before.
  **Decision:** the classic page hid each notification's state in a tooltip and the channels in
  a multi-select dropdown; the state ("…are turned off") is now the section's visible
  description, and the channels are visible checkboxes.
- **Decision (design system):** `CheckboxGroup` options can take a `disabledReason`, shown
  under the option (as `Checkbox` already did). Channels that aren't available say why, e.g.
  "Slack alerts are unavailable because Slack notifications are disabled for this environment."
- The account details are a description list. **Gap (island):** the Slack link section is
  classic. The classic spec (25 cases) runs unchanged against the new screen.
  `MultiSelectDropdown` was only used here and is deleted.

### Diagnostics frame (`/admin/diagnostics`)

- Title, description and route tabs (Notifications, plus AI suggestions when that feature is
  on) on the design system; both sections are classic islands. The notifications section lost
  its own "Notifications" h1, which would have been a second h1 under the new frame.
- **Decision:** the classic frame showed "Loading AI diagnostics configuration." while it
  checked the feature flag; the AI tab now simply appears once the check finishes.

### Agents, risk templates, subject templates, import: design-system headers over classic bodies

- **Decision:** these admin pages are large and heavily tested (Agents alone has a 700-line
  spec), so they get the lightest migration: a design-system screen supplies the title and
  description (and a breadcrumb on a subject template), and the classic view renders inside it
  as an island. Each classic view takes an `embedded` prop that leaves out only its old
  PageHeader/PageSubHeader, so the classic specs (which mount the views directly) run unchanged.
- **Gap:** their primary actions (Register agent, Create template, Edit template) are still the
  classic buttons inside the body rather than design-system header actions. Moving them means
  exposing the view's handlers and updating those specs; I'd do it when each page is rebuilt
  properly.
- Not in the axe checks (mostly classic markup).
- Follow-up: **Inventory**, **Build a profile from props** and **Filter suggestions** get the
  same treatment (design-system header and breadcrumb, classic body via `embedded`). Inventory's
  Create menu and the suggestions page's run buttons stay in the body.
- **Found:** `inventory:index` was defined twice in the router (on `main` too); the duplicate is
  removed.

### Risk page (`/risks/:riskId`) on the design-system frame

- The risk's title is now the page's h1, with a design-system Back action. The 4,400-line
  classic page renders below as an island (`embedded` hides its header and duplicate title)
  and still decides where Back goes (the system's register, or history). It exposes only
  `riskTitle` and `goBackToPreviousPage` to the frame. The SSP-scoped risk URL uses the same
  screen. The classic spec (52 cases) runs unchanged.
- **Milestone:** with this, **every top-level page in the app renders on the design-system
  frame.** What's left classic is content inside frames: record tabs (profile, component
  definition, assessment plan and results, POA&M, workflow definition and instance), Configure
  System sections, and the island panels listed in `docs/REDESIGN.md`.
- **Gap (island):** the risk page body (overview, lifecycle actions, the eight tabs,
  remediation) is classic and isn't in the axe checks.

### Record pages' JSON tabs (first islands replaced)

- **Decision:** the five OSCAL record pages (profile, component definition, assessment plan,
  assessment results, POA&M) each had their own JSON tab view; they now share one
  design-system tab (`src/screens/documents/DocumentJsonTab.vue`): the full document as
  kebab-case OSCAL JSON in the design-system code block, which copies and downloads it. The
  classic assessment plan tab carried a commented-out "Edit JSON" feature; that's gone with it.
- The two workflow JSON tabs build their JSON from store state (definition plus steps, instance
  plus role assignments), so they stay classic for now.
- Follow-up: the two **workflow JSON tabs** are design-system too (definition plus steps;
  instance plus role assignments and the last ten runs), in the same code block. The classic
  views' own copy and download toasts are replaced by the code block's.

### Toasts: a design-system toast region for the whole app

- **Decision (design system):** the mockup's `ToastRegion` and its toast policy are ported, and
  the global PrimeVue `<Toast />` is gone. The region listens to PrimeVue's toast event bus, so
  the roughly 700 existing `useToast().add(...)` calls (classic pages and screens) all show
  design-system toasts unchanged. This fixes the colour-contrast failure found earlier.
- **Decision (behaviour change):** success and info toasts dismiss after 5 s; warnings and errors
  now **stay until dismissed** (the mockup's policy, and better for accessibility). Call sites'
  `life` values (often 3 s for errors) are ignored. A repeated message replaces the earlier one.
- Toasts are announced politely (success, info) or assertively (warnings, errors). A new axe
  test checks a page with a toast on screen.
- Follow-up: **confirmations get the same treatment.** A design-system `ConfirmHost` replaces
  PrimeVue's global `<ConfirmDialog />` and listens to PrimeVue's confirmation event bus, so the
  23 classic `confirm.require(...)` calls (delete catalog, delete control link, run or cancel a
  workflow, and so on) open the design-system confirm. The header becomes the title, the message
  the body, and the accept and reject labels the buttons. It's destructive styling when the
  accept severity is `danger` or the wording says delete or remove, primary otherwise.
- Also in this stretch: the assessment results **Local definitions** and **Back matter** tabs
  were "coming soon" placeholders; they're removed from the tab bar and their URLs redirect to
  the overview.
- And the app-wide **error dialog** (`services/error-dialog`, used by `useAxiosErrorDialog`) is
  now a design-system dialog too. With the toast region and the confirm host, nothing PrimeVue
  is mounted globally in `App.vue` any more; PrimeVue remains only inside classic islands.

### Profile Compliance tab

- **Decision:** This System > Compliance's body (totals, overall and per-group breakdowns,
  implementation coverage, filterable controls) is now its own component,
  `ComplianceProgressView`. The profile record's Compliance tab reuses it, replacing the
  classic `ComplianceProgressPanel` (deleted, with its spec). The profile tab hides the
  inherited-capability links, which only make sense for a system.

### Record pages' Overview tabs

- **Decision:** the component definition, assessment plan, assessment results and POA&M
  overviews now share one design-system tab (`DocumentOverviewTab`): details (title, version,
  published, last modified, OSCAL version, UUID, remarks), what the document imports (an
  assessment plan's SSP, assessment results' plan), and counts of what it contains. "Edit
  details" goes to the design-system edit form where one exists. Delete stays where the classic
  overview had it (assessment results only), with a design-system confirm.
- Dropped from the classic overviews: buttons that duplicated the tab bar ("Manage tasks", "Edit
  component templates"), "Available features" notices, and the POA&M overview's preview of its
  first five items (the POA&M items tab lists them).
- **Gap:** the profile's first tab (Controls) and the workflow overview tabs are still classic.

### Profile Controls tab

- Counts as a description list; each catalog import is a design-system disclosure with Save and
  Remove import; "Add catalog import" below. **Gap (islands):** the include/exclude control-group
  editor and the catalog picker dialog are classic. The script is the classic page's.
- **Found (classic bug, fixed here):** the classic tab built its import→catalog map when the
  imports loaded. If the back matter arrived second (as it does in local-dev), no import
  resolved, and every control group requested `/api/oscal/catalogs/undefined/full` (400). It now
  rebuilds the map when either list arrives.
- **Found (data):** the local-dev profile "Meridian Delivery Controls — Basic Profile" imports
  the same catalog four times.

### Workflow definition Overview tab

- The edit form (name, description, version, suggested cadence, grace period, required
  evidence as checkboxes) and the metadata are design-system; the script is the classic page's.
  Save explains why it's unavailable ("Nothing has changed yet.").
- **Found (classic bug, fixed here):** Save was enabled on an untouched form, because the
  evidence watcher rewrote `evidenceRequired` in a normalised form after the "original" snapshot.
  The form now normalises before taking the snapshot.
- **Workflow instance Runs tab**: a design-system table (started, status badge, triggered by,
  completed or cancelled), newest first; each run's start time opens its run page. The classic
  spec is ported; its date check no longer depends on the test machine's timezone.
- **Workflow instance Overview tab**: edit form (name, description, cadence or cron, grace
  period), a link to its definition, and metadata, all design-system; the script is the classic
  page's.
- **Assessment plan Tasks tab**: design-system Add task and empty state; each task's detail
  editor and the new-task dialog stay classic islands. With a throwaway plan (created through
  the API, then deleted), the assessment plan record page was checked in a browser for the first
  time: Overview, Tasks and JSON all work. (The API rejects a plan without a version; the new
  form always sends one.)
- **Decision:** the assessment results **Import AP** tab duplicated the edit form (which edits
  the import-AP reference and remarks), so it's removed and its URL opens the edit form. Its
  prefill check moved to the shared form's spec. The assessment results record now has
  Overview, Results and JSON.
- **Decision:** the POA&M **Import SSP** and **System ID** tabs (read-only values plus create and
  edit dialogs) are folded into the POA&M form: a required System ID (with an optional
  identifier type) and an optional SSP reference, on create and edit. Their URLs open the edit
  form. The classic create silently sent the placeholder system ID `change-me`; now you enter
  the real one. (Checked: a full-document PUT persists both.)
- **Found:** the API rejects POA&Ms and assessment plans without `metadata.version`. The
  shared form now requires a version for every document type that has one, starting at "1.0",
  instead of showing the API's raw "metadata.version is required" after submit.
- **Profile merge settings** (`/profiles/:id/merge`, still not on the tab bar): merge type as a
  radio group, combine as a checkbox and method select. **Found (API):**
  `GET /api/oscal/profiles/:id/merge` returns 500 for the local-dev profiles; the tab now shows
  an error with Try again, where the classic one stayed blank.
- **Workflow definition Steps tab**: Add step, the step graph (classic island), and a
  design-system table of steps (name, description, role, evidence and dependency tags) with
  Edit and Delete in the row menu. Add and Edit open the step form (classic island) in a
  design-system drawer. The classic spec is ported.
- **Workflow definition Controls tab**: fully design-system now. Linked controls are a table
  (control ID and title, catalog by title rather than UUID), with Unlink in the row menu.
  **Link control** is a design-system dialog with filterable catalog and control pickers.
  **Found (classic bug, fixed here):** the classic picker listed only controls inside catalog
  groups, so catalogs whose controls sit at the root (policies, procedures) offered none. It now
  uses `useControlOptions`, like New control link.

### Smoke test of every page

- A live sweep of 66 pages in local-dev (every list, record and tab, with real IDs) checking for
  page errors, failed requests and exactly one h1: all clean after one fix.
- **Found (classic bug, fixed here):** user lookups (`useUserSearch().loadUsersByIds`) sent every
  assignee reference to `GET /api/users/:id`, including role and group names such as `it-iam`
  (a 400 each, e.g. on a workflow instance's Role assignments tab). It now looks up only UUIDs.
- **Configure System → JSON** now uses the shared `DocumentJsonTab` (the system's security plan
  as OSCAL JSON in the design-system code block); the classic SSP JSON view is deleted.
- **Configure System → Overview** is rebuilt: details, the system's profiles (the same
  save-as-you-tick `ProfilesField` as Implementation, replacing the classic multi-select),
  counts of users, components, inventory and leveraged authorizations, and a characteristics
  summary. **Decision:** its Download JSON button is dropped, since the JSON section copies and
  downloads. The classic view's profile-binding cases now test `useSspProfileBindings` directly
  (it had no spec of its own).
- **Component definition Back matter tab**: each resource as a panel (description, remarks,
  citation, links, UUID), with Add resource always available. The classic tab only offered it
  while the list was empty. The new-resource dialog stays a classic island.
- **Configure System → Characteristics**: the metric cards (sensitivity, authorization,
  diagrams, completeness) are a description list; system information is a panel with Edit; the
  network architecture, authorization boundary and data flow are panels ("Not described yet"
  when absent). Edit opens the classic characteristics form (island) in a design-system dialog.
  The script and spec are the classic page's, ported.
- **Found (mine, fixed):** a sweep of every Configure System section showed **Users** and
  **Leveraged Authorizations** requesting `/system-security-plans//...` with an empty id, so they
  always looked empty. Their classic wrappers read only `:id` from the route, which the merged
  page (`/systems/:systemId/configure/...`) doesn't have. `getIdFromRoute` now falls back to
  `:systemId`, which fixes every wrapper using it. This regression came from the
  Configure/SSP-editor merge earlier in the weekend.
- **Found (API):** on Control Implementation,
  `GET /system-security-plans/:id/system-implementation/components/:componentId` returns 500
  for one of the Payments system's components.
- **Configure System → Scope**: the automatic-filters checkbox, scope entries and exceptions
  as design-system tables (labels as tags joined by AND, origin, created), with Remove from
  scope and Delete exception in the row menus; Add entry below. Remove still confirms (now
  through the design-system confirm host). **Gap (island):** the label builder is classic. The
  classic `ScopePanel` and its spec are ported and deleted; unavailable actions now say why
  instead of being plain disabled.
- **Configure System → Components**: each component is a design-system disclosure with type,
  status and open-risk tags, a row menu (Evidence filters when that feature is on, Edit,
  Download source, Delete), and its description, purpose and protocols as a description list.
  Edit and New component open the classic forms (islands) in design-system dialogs; the
  evidence-filters drawer (still deep-linkable) is a design-system drawer. **Gap (island):**
  each component's risk list is classic. `ComponentsPanel` is deleted.
- **Configure System → Authorization Boundary**: three design-system panels (authorization
  boundary, network architecture, data flow), each with Add diagram; every diagram is a
  disclosure with rename (inline field) and delete. **Gap (island):** the draw.io editor is
  classic; it stays mounted while a diagram is closed, as before. Checked live: add, edit
  open, and delete through the confirm. The classic DiagramsView and its spec are ported and
  deleted. **All six visible Configure System tabs are now design-system**; the hidden sections
  are still classic.
- **Component definition Components and Capabilities tabs**: design-system disclosures with
  facts, control implementations (an item list with requirement counts) and an actions menu
  (edit; download JSON for components). Capabilities now name incorporated components by title
  instead of bare UUIDs. **Decision:** the per-component JSON download fetches as text, so the
  file keeps the API's own keys, replacing a raw `fetch` that bypassed the API client (new
  `downloadText` helper beside `downloadJson`). **Gap (island):** the new/edit forms are classic,
  inside design-system dialogs; the classic modal wrappers and display components are deleted.
  Every component definition tab is now design-system, so the record no longer has a classic
  frame. Checked live on "k8s components". **Gap:** record-page tabs are still not in the axe
  e2e run (true of every record page so far).
- **POA&M items, Observations, Risks and Findings tabs**: one design-system tab
  (`PoamCollectionTab`) configured per kind in `poamCollections.ts`, like the document forms.
  Each entry is a disclosure with count tags, facts and a menu (edit, delete; items also attach
  or detach; risks also open the risk page), with the design-system confirm. **Decision:** findings
  now show their target as "type: title or id" and their states as text, instead of raw JSON.
  **Gap (island):** the forms, the attach dialog and the POA&M item details and milestones stay
  classic. The record screen keys its tab by route, since four tabs share one component. Checked
  live: create observation, create item, attach dialog, delete item.
  **Found (fixed):** creating an observation without a Collected date failed with "Invalid time
  value" (classic bug). An empty Collected now means now (OSCAL requires it); an empty Expires is
  left out. Test data: observation "Weekend observation" on "Weekend test POA&M".
- **POA&M Local definitions and Back matter tabs**: design-system. Local definitions show three
  panels (components, inventory items, assessment assets) and remarks, with Add or Edit opening
  the classic form in a dialog. Back matter resources are disclosures with their facts (document
  IDs, citation, links, embedded file, properties) and an edit/delete menu; the classic details
  component is deleted. **Decision:** `useApiQuery` gained `notFoundIsEmpty`, since these two
  endpoints answer 404 while a plan has none; the classic back matter page showed that 404 as an
  error. Every POA&M tab is now design-system; only the risk page under it keeps a classic frame.
  **Found (API, not fixed):** adding the first back matter resource to a POA&M fails with a 500
  (`POST .../back-matter/resources`, logged with no detail). The classic page uses the same form
  and endpoint, so it fails there too.
- **Assessment results → Results tab**: fully design-system, with no islands. Each result is a
  disclosure with count tags, its period and description, and item lists of its findings,
  observations and risks. Delete goes through the design-system confirm. New result is a
  design-system dialog with validation (title, start, end after start); as before, it reviews all
  controls. **Decision:** the classic View and Edit buttons are dropped: they linked to
  `/assessment-results/:id/results/:resultId(/edit)`, which were never routes (they 404'd into
  the not-found page). **Option for you:** a result page (findings, observations, risks in full)
  would be the natural next step if results matter to users. Every assessment results tab is now
  design-system, so that record has no classic frame. Test data: "Weekend test AR".
- **Workflow instance → Roles tab**: design-system table of every role the workflow's steps name
  (plus any other assigned role), with who holds it ("Unassigned" tag; groups shown as
  "id (group)") and a summary of how many are still to assign. **Decision:** assigning is per
  role (menu → Assign role → a Combobox of people) instead of the classic all-roles dialog; to
  hand a role to someone else, remove it, then assign it, as before. The picker loads
  `/api/users/select` once and filters as you type, so it needs no async search. Checked live
  on "Annual DR Exercise — Customer Portal" (I removed and restored the seed `it-ops` group
  assignment; it has a new ID now). Every workflow instance tab is now design-system.
  **Found (fixed):** the design-system Combobox's list had none of its styles (no width, border,
  background or max height). Its element is the inner node of a popper wrapper, which doesn't
  get Vue's scope attribute. That rule is now in an unscoped style block; this also fixes the
  Combobox on New control link and workflow definition Controls.
- **Shared `RecordCollection`** (`src/screens/RecordCollection.vue`, kinds typed in
  `collectionKind.ts`): the list-of-entries-in-a-record pattern (New; each entry a disclosure
  with tags, facts and an edit/download/delete menu; classic forms in design-system dialogs;
  design-system delete confirm). POA&M items, observations, risks and findings now use it, with
  slots for the item details and attach dialog. **Decision:** new collection screens should be a
  kind config plus this component, not another copy.
- **Configure System → Users and Leveraged Authorizations** (hidden sections, reached by link):
  now RecordCollections. Users are titled "Title (short name)", with role tags and their
  privileges as one fact; authorizations are tagged with their authorization date and keep the
  link to Inherited capabilities. The classic panels are deleted. Checked live on Payments
  Processing Platform: create and delete a user.
- **Configure System → System Implementation** (hidden section): design-system, with no islands.
  A panel shows remarks, properties and links; a Contents panel shows user and component counts
  linking to their sections; Edit opens a design-system dialog (remarks, plus properties and links
  as field lists). Checked live: save, reload, revert. The classic editor view, overview form and
  wrapper spec are deleted. **Found (fixed):** design-system "Links" facts (here, and on the
  component definition and POA&M back matter tabs) showed blank instead of "Not set" when there
  were none.
- **Configure System → Leverage and Inherited Capabilities** (hidden sections): design-system.
  Leverage is a table of published offerings (title and description, version, item summary)
  with Subscribe; the subscribe wizard is a classic island in a design-system dialog. Inherited
  Capabilities lists each inherited control as a disclosure with its offering and satisfaction
  tags, a warning for drifted or revoked links (drift-risk link; Re-attest through a
  design-system confirm) and outstanding responsibilities with posture badges. **Decisions:**
  drifted and revoked capabilities start open so their warnings are seen. Subscribe and
  Re-attest are shown disabled with a reason when you lack permission (the classic page hid
  them), as the design system asks. The data rules are kept: only the flat offerings catalog and
  the leveraged-controls projection are fetched, the latter with the posture-map stop path.
  Both classic specs are ported (including the subscribe flow through the real wizard). **Gap:**
  local-dev has no published offerings, so only the empty states were checked live; the specs
  cover the populated ones.
- **Configure System → Export Offerings** (hidden section): design-system table (offering and
  description, status, version, items, published date) with a menu per offering: edit, manage
  items, allowed downstream systems, publish or republish, deprecate, revoke. Deprecate and
  revoke go through the design-system confirm. The create and edit forms and the items and
  allowlist editors are classic islands in design-system dialogs. The classic panel's
  stale-SSP guards are no longer needed: Configure sections remount on a system switch. Both
  classic specs are ported (create, edit, publish, status changes, permissions). Checked live:
  create, manage items, publish, revoke. **Gap (island):** inside the items editor, Escape
  doesn't close the dialog when focus is in its classic select, which handles the key itself.
  **Test data:** three draft-or-revoked "Weekend offering"s on Payments Processing Platform
  (offerings can't be deleted).
- **Configure System → Control Implementation: retired (option A, your call).** Its three old
  URLs (Configure, `/system/control-implementation`, and the SSP editor's) now redirect to
  Implementation, and the view and its four classic forms are deleted. **Lost:** editing the
  control implementation's own description and set-parameters, and adding implemented
  requirements for controls outside the profile; the API still accepts them. Every Configure
  section is now design-system, so the section frame no longer wraps anything in `LegacyPage`.
  The options as first written:
- **(Superseded) Configure System → Control Implementation: left classic, options for you.** It is the
  last classic Configure section, a 980-line raw OSCAL editor (control implementation
  description, implemented requirements, statements, by-components, each with its own classic
  form). Nothing in the app links to it any more; only old SSP-editor URLs and typed URLs reach
  it. The Implementation page covers per-control statements and by-components for everyday
  work. Four of its forms (control implementation, implemented requirement create/edit,
  by-component edit) are used nowhere else. Options:
  - **A. Retire it:** redirect the URL to Implementation and delete the view and its four
    forms. That loses editing the control implementation's own description and set-parameters
    in the UI, and adding implemented requirements for controls outside the profile.
  - **B. Rebuild it as an "Advanced (OSCAL)" Configure tab**, a RecordCollection of implemented
    requirements with the classic forms as islands: about a day.
  - **C. Leave it as is** (current state): hidden, classic, working.
    My recommendation is **A** if no one uses those three capabilities, otherwise **B**.
- **Implementation drawer: AI suggestions and component statements** are design-system
  (`ControlSuggestions`, `ByComponentStatement`). Each component statement is a panel with its
  status tag, open risks for the control (linking to the register), the markdown statement and
  remarks, and an Edit/Delete menu. Edit happens in place, with design-system fields, and delete goes
  through the design-system confirm. **Found (fixed, affects `main`):**
  1. The drawer's Edit and Delete never worked. The classic drawer rendered the statement
     component with no save or delete handlers, so edits vanished silently. The screen now saves
     and deletes through the API.
  2. The drawer listed only requirement-level component statements, while nearly all live on
     the requirement's statements, so it said "Components (0)" for controls the tree counts as
     implemented. It now lists both, and saves each kind to its own endpoint.
     Checked live on Payments Processing Platform (INT-CI): edit, save, revert. **Decision:** AI
     suggestion reasoning is shown in full instead of clamped behind "Show more". **Gap (island):**
     the shared-responsibility panel and blocks and the export dialog are still classic.
- **Second live sweep (89 routes**: the earlier 66 plus every POA&M and assessment results tab
  and all twelve Configure System sections): one h1 each, no page errors. Remaining API
  responses are known: a 404 for a system with no network-architecture diagram (handled as "Not
  described yet") and the known 500 for one component GET under Control Implementation.
- **Assessment plan → Tasks**: now a RecordCollection (type tag, description, timing as "1 Jan
  2026 to 31 Mar 2026" / "On …" / "Every …", remarks); opening a task loads its activities, each
  a panel with its steps as an ordered list. The task forms are classic islands
  (`RecordCollection` now also accepts `updated` from edit forms). Every assessment plan tab is
  design-system, so the record has no classic frame. The classic task detail and modals are
  deleted, along with four assessment-plan activity modals and forms that nothing used. Checked
  live: create, open and edit a task. **Test data:** assessment plan "Weekend test AP" with
  the task "Weekend scan" (my check script put "Weekend scan (renamed)" in its Type field).
- **User and group pages: members and roles** are design-system. Group members are a table
  (name, email, native or synced from SSO) with Add member (a filterable picker over the user
  directory, leaving out existing members) and Remove; SSO-synced memberships are shown with
  Remove disabled and the reason. Roles are one shared `RoleAssignmentsSection` for users and
  groups: role, source (manual or configuration) and, for users, origin (direct or inherited
  via a group), with Assign role (only roles not already held directly) and Remove (disabled
  with the reason for configuration and inherited grants). **Decision:** Remove and Assign are
  shown disabled with a reason instead of hidden. Both classic role specs are ported. Checked
  live on "Weekend test group": add member, assign role, remove both (group restored).
  These pages now have no classic islands.
- **Build a profile from props**: fully design-system: catalog picker, title and version, "any
  or every rule matches" (segmented radio), rules as a field list (prop name, operator, value),
  inline validation, and a result panel linking to the new profile with the matched control IDs
  as tags. **Decision:** the free-text Catalog UUID field is gone; the catalog is chosen from the
  list (the two fields duplicated each other). Checked live. **Test data:** profile "Weekend
  props profile" (profiles can't be deleted).
- **Import**: the OSCAL and evidence-filter imports are design-system panels, each with a
  multi-file picker, Import, and a result per file (success or error, with the document type
  and title, or the number of filters). The workflow import panel stays a classic island.
  **New design-system piece:** `FileField` gains `multiple` (`v-model:files`; each file listed
  by name and size, with "Remove files"). The single-file API is unchanged. **Found (fixed):**
  when every file fails, the import endpoint answers 400 with the per-file results in the
  body; the classic page showed only "Failed to import", so you couldn't tell why. The results
  now show. Uploads go through the API client instead of raw axios. Checked live with two
  invalid files (nothing created).
- **Axe:** Build a profile from props is added to the e2e axe run and passes. Import isn't
  added: its classic workflow import panel fails colour contrast (`.py-0` text). **Gap
  (island).**
- **Record pages are now in the axe run:** the Overview and every other tab except JSON of
  the component definition, assessment plan, assessment results and POA&M records (16 routes), in all four data states and both themes, backed by one generic e2e mock
  for those records' sub-collections. All pass. This closes the "record tabs not in axe" gap for
  these four record types; profile, workflow and evidence-style records are unchanged.
- **Configure System sections in the axe run:** characteristics, components, scope, system
  implementation, users, authorizations, export offerings, leverage and inherited capabilities,
  in every state and theme. Scope failed at first: its classic label-condition builder had
  unnamed PrimeVue dropdown buttons. It is replaced by a design-system `LabelConditionFields`
  (field list of label and value, completing label names and server-searched values), so Scope
  has no islands now. Checked live: add a scope entry with the new fields, then remove it.
- **User and group pages in the axe run** (with members and direct, inherited and configuration
  roles in the mocks), in every state and theme: they pass.
- **Subject template page**: fully design-system, as a record with Edit (opens the template's
  form on the list, as before) and panels for details, text templates, identity and selector
  labels, label schema, props and links. "Back to list" is now the breadcrumb. The classic view
  and its spec are replaced (spec ported). Checked live on "dependabot-repository".
- **Inventory**: fully design-system list page. Sources (checkboxes) and asset type are filters
  kept in the address (`?sources=…&type=…`), with chips and Clear filters; a table of item, asset
  type, origin and source; and a menu per item: view details (drawer), edit, attach to
  components, download JSON, delete (design-system confirm). The create, edit and attach forms
  are classic islands. Added to the axe run. **Decisions:**
  1. Edit, attach and delete are shown disabled with the reason for items not in this system's
     plan (the classic page hid them).
  2. The classic "Add to SSP" button on evidence and POA&M items only toasted "Feature coming
     soon", so it's dropped.
  3. Items are named by asset-id, then description, then their `name`/`app_name` prop, so
     evidence items are no longer all blank.
     **Found (fixed, design system):** `useApiQuery` showed an error for `{"data": null}`, which Go
     APIs send for an empty list (here, filtering inventory by type). It now shows the empty state.
     `useApiQuery` also accepts a reactive URL now, fetching again when it changes.
- **Subject templates list**: design-system list page with search, type and source-mode
  filters and sorting (all in the address), names linking to the template page, and a menu to
  edit or duplicate (with a unique "(Copy n)" name). `?edit=<id>` still opens the editor (the
  template page's Edit uses it). The form moved out of the classic page into its own classic
  component, `SubjectTemplateForm`, shown in a design-system dialog. **Decisions:**
  1. Client-side pagination is dropped (deployments have a handful of templates; the table
     sorts and filters instead).
  2. A 403 now shows the design-system "no access" state instead of a toast.
  3. Edit for a template without an ID is disabled with the reason instead of erroring on
     click.
     The classic spec is split into list and form specs. Checked live: list, edit and save.
- **Subject templates list and page in the axe run** (every state and theme): pass.
- **Catalog page: the control tree** is design-system (`CatalogGroupNode`, `CatalogControlNode`,
  recursive). Each group or control is a disclosure whose open state is remembered across
  reloads (same store as before), holding its parts as markdown (one shared `partMarkdown`
  helper replaces `PartDisplayEditor`), evidence results as status badges, attributes, children,
  and a menu: edit, edit description or parts, add a group or control inside, evidence (for
  classed controls), delete (design-system confirm). The add and edit forms stay classic modals.
  The global `CatalogGroup`/`CatalogControl` registrations are gone (AGENTS.md updated).
  **Decisions:**
  1. Actions live inside an opened node, not on its header row; the design-system disclosure
     has no header actions.
  2. Evidence counts show inside the control, not on its row.
     Checked live on "Meridian Internal Controls — Delivery": open, reload (stays open), menus,
     edit modal.
- **Catalog page in the axe run** (a mocked catalog with a group and a control, every state and
  theme): passes.
- **Profile Controls: control groups and catalog import** are design-system, so the profile
  page has no islands now. Each import shows its included and excluded groups as panels: control
  IDs as tags with a named remove button each, a Combobox of the catalog's controls (only those
  not already in the group; it includes root-level controls, which the classic picker missed)
  and Add, plus Remove group and New group. "Import a catalog" is a design-system dialog listing
  catalogs, with already-imported ones disabled and the reason given. It reads through
  `useApiQuery` instead of the old fetch client. The classic group editor, control editor and
  dialog are deleted. Checked live on "Meridian Delivery Controls — Regulated Profile" (nothing
  saved).
- **Workflow run page: steps and timings** are design-system. One steps table (in order: name
  with failure, overdue or completion notes; status badge; responsible role; due; done; how
  long it took from the run metrics; evidence count; Open for the step panel) replaces both the
  classic step list and the metrics block. The run's total and average step times join the
  existing facts. **Gap (island):** the step graph and the step panel (811 lines, with its
  evidence form) stay classic. Checked live on the failed Quarterly Access Review run: table,
  facts, Open.
- **System template page: created systems** is a design-system panel (label values verbatim,
  the system linking to Configure System or "(deleted)", Stale tag, created and last-seen times,
  error and skipped values, Refresh, and Forget for deleted ones through the design-system
  confirm; Forget is disabled with the reason when the API gave no key). It uses the reactive
  `useApiQuery` URL and keeps the label-key stop path. The classic table and its spec are
  replaced (spec ported). **Gap:** local-dev has no system templates, so it was not checked
  live. The preview panel and form dialog stay classic.
- **System template page: preview** is design-system too (on-demand Preview; a summary
  sentence; a panel per system it would create or that exists, with the entries it would learn
  or skip; groups below the minimum streams; invalid key values; failures as an inline error).
  Only the edit form is still classic on that page. Spec ported; not checked live (no
  templates in local-dev).
- **System template page in the axe run** (mocked template and created systems, every state and
  theme): passes. This also gives the preview and created-systems panels a rendered check.
- **Workflow definition → Steps: the step form** (Add/Edit step drawer) is design-system: name,
  description, responsible role (completing roles other steps use), order, grace period,
  "Evidence required" with requirements as a field list (type, description, required), and
  "Depends on" as checkboxes of the other steps. The script is the classic form's, unchanged.
  **Decision:** dependencies are a checkbox group rather than a multi-select (workflows have a
  handful of steps, and the design system has no multi-select). Checked live: opening and
  cancelling the drawer (nothing saved). Only the step graph is still classic on that tab.
- **Assessment plan task form** is design-system: one `TaskForm` for add and edit (title, type
  with completions, description, "When" as not scheduled, on a date, within dates or
  repeating, and, when editing, "Depends on" as checkboxes of the plan's other tasks, keeping
  existing dependency remarks). `RecordCollection` gained `designSystemForms` so such forms
  aren't wrapped in the classic frame. The classic create and edit forms are deleted; the classic
  timing and dependency managers remain for the workflows partials that still use them.
  **Found (fixed):** date schedules never saved; see the summary. Checked live on "Weekend test
  AP": schedule a task within dates, add and delete another.
- **POA&M item form** is design-system (`PoamItemForm`, add and edit: title, description,
  remarks, inline validation; editing keeps the item's links). The classic create and edit
  forms are deleted. Checked live: add, edit, delete.
- **Component definition capability form** is design-system (`CapabilityForm`, add and edit:
  name and description). **Decision:** the classic form's Properties and Links fields are gone;
  the API never stored them (the classic code sent empty lists whatever you typed). **Concern
  for you:** editing a capability sends only its name and description, as the classic form did.
  If the API replaces the whole record, its incorporated components and control implementations
  could be lost; worth checking against the API. Checked live on "Weekend test CD": add, then
  edit, and the edit survives a reload. **Test data:** capability "Weekend capability" (there is
  no delete).
- **Component definition component form** is design-system (`DefinedComponentForm`, add and
  edit: title, type with completions, description, purpose). The classic form's dead Properties
  and Links fields are dropped, as with capabilities; the same "edit sends only these fields"
  concern applies. Checked live on "Weekend test CD": add, then edit, and the edit survives a
  reload. **Test data:** component "Weekend component" (no delete).
- **Component definition back matter form** is design-system (title, description, remarks,
  citation, links as a field list). Every component definition tab and form is now
  design-system; `src/components/component-definitions` is gone. **Found (fixed):** adding a
  resource never saved; see the summary. Checked live on "Weekend test CD" (two resources now:
  "Weekend resource" with a link, and "Weekend resource 2" from probing the API).
- **POA&M back matter: first resource now saves.** `POST .../back-matter/resources` answers 500
  when a plan has no back matter yet, but works once one exists. New resource now creates an
  empty back matter first (`POST .../back-matter` with no resources) when there is none. Checked
  live on a temporary POA&M with no back matter (created and then deleted through the API): the
  first resource saved. **For the API team:** the resources endpoint should create the back
  matter itself.
- **Configure System → Users: the user form** is design-system (`SystemUserForm`: title, short
  name, description, role IDs and each privilege's functions as comma-separated fields,
  privileges as a field list; editing keeps the user's other fields). The classic create and
  edit forms are deleted. Checked live: add a user with roles and a privilege, then delete it.
- **Configure System → Leveraged Authorizations: the form** is design-system: title, "Granted
  by" as a Combobox of parties (the classic form wanted a raw party UUID), date authorized,
  remarks. **Decision:** the classic form's Properties and Links rows are dropped from this form
  (they are kept on save when editing). Checked live: add, then delete.
- **Configure System → Components: the component form** is design-system (`SystemComponentForm`,
  add and edit): optionally start from a component definition's component (its fields then show
  read-only), type with completions, title, description, purpose, status and status remarks,
  remarks, and protocols as a field list with nested port ranges. The classic forms remain only
  for the classic per-control statement editor on Implementation. Checked live: add with a
  protocol and port range, edit, delete, and the template path (fields fill and lock; cancelled).
- **Export offering form** is design-system (`ExportOfferingForm`, add and edit: title and
  description). Checked live: edit a description, which survives a reload.
- **Inventory: the edit form** is design-system (description and remarks; keeps the item's
  other fields). The create form (choose the destination: plan, POA&M, assessment plan or
  results) and the attach editor stay classic. Checked live: create (classic), edit, view
  details, delete.
- **POA&M observation form** is design-system (`ObservationForm`, add and edit): title,
  description, methods and types as checkboxes of the OSCAL values (plus any others the record
  already has), collected (empty means now) and expires (must be later), remarks.
  **Found (fixed):** the classic edit form lost existing timestamps; see the summary. Checked
  live: edit "Weekend observation" (its time shows; adding a method saves and keeps the date).
- **POA&M finding form** is design-system (`FindingForm`, add and edit): title, description,
  what it is about (control objective or statement, and its ID), result (satisfied or not),
  optional implementation status, the plan's observations and risks as checkboxes, remarks.
  **Decision:** the classic form's free-text Status (open, in progress, …) is replaced by the
  OSCAL result, since that is what a finding's target records. **Found (fixed):** see the summary.
  Checked live: add with a linked observation, reload, delete.
- **Third live sweep (97 routes**, adding the assessment plan record, Inventory, Build a profile,
  Import and subject templates): one h1 each, no page errors; only the known API responses.
- **POA&M back matter form** is design-system (`PoamResourceForm`, add and edit: title,
  description, remarks, citation, document IDs, links, properties; editing keeps an embedded
  file). Unlike the classic form, it doesn't save empty citation and embedded-file stubs.
  Checked live: add with a document ID, edit the citation, delete.
- **POA&M local definitions form** is design-system (components, inventory items and assessment
  components as field lists, plus remarks; still one PUT for adding and editing). **Decision:**
  new components default to Operational, so they're no longer silently dropped for lacking a
  status; empty rows are dropped. The classic spec is ported. Checked live: add a component and
  an inventory item, reload, then remove them again (plan back to empty).
- **Risk forms (create and edit)** are design-system, transplanted in place (same files and
  scripts) so both their users get them: the POA&M Risks tab and the classic component risks
  list in Configure System. The risk-template picker is a design-system dialog with a table;
  "Use Template" is disabled with the reason when templates are forbidden (it used to rename
  itself "Templates Unavailable"). Both classic specs adapted (portal, tooltip provider,
  wording). Checked live on the POA&M Risks tab: picker, create with status and impact, edit,
  delete. **Found (API, harmless):** the edit form's "refresh before save" GETs
  `/plan-of-action-and-milestones/:id/risks/:riskId`, which answers 404; the form falls back to
  the risk it was given, as before.
- **POA&M item links** ("Link findings, observations, risks", replacing "Attach or detach") are a
  design-system form: the plan's findings, observations and risks as three checkbox groups
  (with status or methods as each option's description), the item's current links checked, and
  one Save. The classic attach dialog with its tabs, search and per-row attach/detach buttons is
  deleted. Checked live: link the observation to a new item, reload (the link is there), delete.
  Only the item details and milestones panel is still classic on the POA&M page.
- **POA&M item details** are design-system (`PoamItemFacts`: description, remarks, properties,
  links, origins, and the linked findings, observations and risks named from the plan, flagging
  any not found). **The POA&M record is now design-system throughout** (every tab, form and
  dialog); only the risk page opened from it is classic. Checked live.
- **Export offering allowlist** is design-system (`OfferingAllowlist`: allowed systems by title
  with a named Remove, a Combobox of other systems, never the offering's own, and Allow). It keeps
  the classic rule that "any system may subscribe" is only said about a list that actually
  loaded. Permission-gated actions are disabled with the reason. The classic spec is ported.
  Checked live: allow a system, then remove it.
- **Export offering items editor** is design-system (`OfferingItems`: each item as control and
  statement over component and capability, with a named Remove; a Select of the plan's
  statement-level capabilities and Add item). Requirement-level capabilities stay listed but
  can't be chosen, with the reason in the option. A revoked offering says so and its actions are
  disabled with the reason (the classic editor hid them). The API's refusal shows by the picker,
  not as a toast. This also closes the classic select's Escape gap noted above. The classic spec
  is ported.
- **Subscribe form** is design-system (`SubscribeOfferingForm`, replacing the classic wizard in
  both its places: Configure System → Leverage and the Implementation statement editor's
  shared-responsibility panel). It has one checkbox group of items to inherit, then one group per
  chosen item, "Already handled for …", for the responsibilities this system already meets.
  Errors show in the form. **Decision:** the button says Subscribe, not Import, to match the
  Leverage table. The classic spec is ported (including the API's `null` responsibilities).
  **Gap:** local-dev has no statement-level exports and no published offerings, so adding an
  item and subscribing weren't checked live (the empty states were); the specs cover both, and
  the request logic is the classic code unchanged.
- **Slack link section on Preferences** is design-system (`SlackLinkSection`, the classic script
  kept: link status, Link Slack or Unlink Slack, finishing the link when Slack redirects back).
  **Decision:** the Slack logo tile is dropped; the section heading says Slack. Checked live: the
  "not configured" state (local-dev has no Slack). The classic spec is ported.
- **Subject template form** is design-system (`SubjectTemplateForm` with `SubjectTemplatePreview`),
  replacing the classic form and its three sub-builders. The label schema, selector labels,
  sample labels, properties and links are field lists. **Decision:** identity label keys are
  checkboxes of the schema's keys (they were a filterable multi-select of the same keys); with no
  schema yet, a caption says to add fields first. Properties and links sit in a collapsed
  "Properties and links" disclosure, as the classic "Advanced" panel did. The form's own checks
  ("At least one selector label is required" and so on) now show in the form, not as a toast.
  The classic system template form uses the new preview too. Both classic specs are ported.
  Checked live: edit and save an existing template, then the empty-form checks.
- **System template form** is design-system (`SspTemplateForm` in a design-system dialog, on the
  list and the template page). **Decisions:** key labels and each scope label group are
  comma-separated text fields, since the design system has no chip input (the classic form used
  PrimeVue's chip AutoComplete). Saved keys show as fixed text, as they can't change. Profiles
  are checkboxes. The form's own checks show in the form. The classic spec is ported. Checked live:
  the new-template form and its checks (local-dev has no system templates to edit).
- **Workflow import** is design-system (`WorkflowImportPanel`, now a third panel beside OSCAL
  documents and evidence filters on Import): files, then the overall result, the record counts and
  a message per file listing that file's non-zero counts ("21 definitions created, 105 steps").
  **Decision:** the per-file table with nine count columns became one message per file, like the
  other two importers. The file count and size limits show as the field's error. The classic spec is
  ported. Checked live with a file that isn't a workflow (the API's parse error shows for it).
- **Inventory create and relationships forms** are design-system (`InventoryItemCreateForm`,
  `InventoryItemRelationsForm`). Create: destination, then (only when needed) which plan, POA&M
  or assessment, description, asset type, remarks. **Decision:** the UUID field and its Generate
  button are gone; a UUID is generated on save. The relationships form ("Attach to components")
  replaces the classic tabs with four field lists: implemented components (a Select of the plan's
  components), responsible parties (a role Select and party checkboxes, where the classic form
  took free-text role IDs and comma-separated party UUIDs), properties and links. Saved values the
  lists don't know still show, by ID. Neither classic form had a spec; both have new ones. Checked
  live: create (asset type kept), attach to a component, both confirmed through the API.
  **Test data:** two "Weekend inventory item"s on Payments Processing Platform, one attached to a
  component.
- **Evidence filter form** is design-system (`EvidenceFilterForm`, on New evidence filter and in
  the list's edit dialog), transplanted with the classic script, which keeps the scope-following
  rules (follow a system's scope, the effective filter, refusing to save until a failed scope read
  is retried). It now saves the filter itself, so failures show in the form. **Decisions:** the
  grouped multi-selects of controls and components became a list of what's linked (each with a
  named Remove) and a Combobox to link one more, as on the export offering allowlist; "controls or
  components, not both" is said as text where the other picker would be, instead of a disabled
  picker. "Global" reads "Global (every system)". **Found (fixed):** a control with
  enhancements couldn't be linked, only its enhancements; an invalid filter made Submit do nothing;
  a failed create was only logged. The classic spec is ported (and the enhancement case added).
  Checked live: the name and filter checks, create with a linked control (back on Evidence), then
  edit and save from the list. Local-dev has filter component linking off, so the component
  picker wasn't seen live.
- **Agents** are design-system: a list (`/admin/agents`: agent, status, keys, last sign-in,
  registered; search in the address) and a record page per agent (`/admin/agents/:id`) with
  Overview, Keys and Configuration tabs. **Decision:** the classic page was one screen with a
  selectable table and a detail card below it; it is now the usual list and record, so an agent
  has its own URL. Registering an agent opens its Keys tab, since a key comes next. A new key's
  dialog turns into the "save the secret now" view (client ID, secret and the curl sign-in
  command, each with Copy), instead of a second dialog. The R40 rule is kept: registration,
  keys, Edit and Delete are hidden (not disabled) for non-admins, and nothing admin-only shows or
  is requested until permissions have loaded (`useAgentAdmin`); a reader who follows a link to
  Keys sees "forbidden" and no keys request is made. **Gap (island):** the Configuration tab is
  still the classic configuration editor (about 6,000 lines with its effective view, overlay
  editor, history and instances). The classic 724-line spec is replaced by specs for the list,
  record, keys tab and key form (same cases: create, edit, keys, revoke, delete, empty state,
  tab visibility, R40 hydration). Checked live: list, overview, create a key (secret shown once),
  revoke it, and the Configuration tab. Agents pages are in the axe run.
- **Risk templates** are design-system: a list (template, statement, likelihood / impact hints,
  used by, created; search in the address) with a menu per template: View details, Edit,
  Duplicate, Delete (the confirm says how many risks use it). The form (`RiskTemplateForm`)
  names each missing required field, and its own checks (incomplete threat IDs, a remediation
  without a title) show in the form. Violation IDs, threat IDs and remediation tasks are field
  lists. The request-building rules moved unchanged into `riskTemplateRequest.ts`, shared with
  Duplicate. **Decisions:** View is a details dialog rather than the form with every field
  disabled. Edit and Delete are disabled with a reason for a template without an ID (the classic
  page let you click and then toasted). "Active state: Unset" reads "State: Not set". The classic
  568-line spec is split into specs for the request rules, the form and the list (same cases).
  Checked live: the required-field checks, create with a threat ID and remediation, view,
  duplicate, delete the copy, edit, delete (nothing left behind). Risk templates are in the axe
  run.
- **Filter suggestions** are design-system (`FilterSuggestions` under the existing header, with
  `SuggestionScopeForm` and `SuggestionGroupForm` in design-system dialogs), transplanted with the
  classic scripts, so grouping, the estimate of AI calls, large-run confirmation, catalog-qualified
  control keys and the edit payload are unchanged. Pending and History are tabs in the address
  (`?tab=history`). Each pending group is a panel with Edit, Accept group and Reject group; each
  suggestion has a checkbox (with confidence), Accept, Reject and a Reasoning disclosure; label
  changes show as added and removed tags. **Decisions:** the controls multi-select in Generate is
  now "All controls" (on by default) or a chosen list with a picker, like the evidence filter
  form; label conditions use the design-system `LabelConditionFields` from Configure → Scope;
  the edit form's controls are checkboxes to keep, plus a picker to add. Generate and Save are
  disabled with the reason (no estimate yet, confirm the large run, keep a label and a control).
  The classic page, both dialogs and the classic condition builder are deleted; their specs are
  ported (the pure `dashboard-suggestions.ts` and its spec stay). Checked live: the page, both
  tabs and the Generate form with its estimate (not run: it calls the AI provider). **Gap:**
  local-dev has no pending suggestions, so groups, accept, reject and edit were checked only by
  the specs.
- **Risk page** is design-system (`RiskScreen`, for `/risks/:riskId` and both record-scoped URLs).
  The classic 4,400-line page's script is transplanted unchanged, so the register it belongs to,
  the lifecycle rules, links, threats, remediations, reviews, history and Back keep their
  behaviour. The template is new: a design-system header (title, status, description, Back),
  route tabs in the address (`?tab=threats`), panels per linked item, and design-system threat,
  remediation and link-picker dialogs. **Decisions:** the POA&M risk is now a page of its own at
  the same URL (like the system one) instead of sitting inside the POA&M record, which gave it two
  page headings. Lifecycle buttons use sentence case ("Start investigation"); "Add evidence/
  control/component" reads "Link …" and "Remove" on links reads "Unlink"; the "Transition Matrix"
  is a list of statuses with the current one marked "(now)". Because route tabs add history
  entries, Back steps back over them to wherever the risk was opened from (new; a spec covers it).
  Edit and Remove on older threats and remediations are disabled with the reason. The owners
  panel (`RiskOwnerAssignment`, also inside the accept dialog) is design-system too: read-only
  facts, then on Assign owners a person picker per owner (all selectable users, as on the
  workflow roles tab) and a "Primary owner" radio group; it had no spec and now has one. It was
  also where the axe run found two contrast failures on this page. **Gap (islands):** the score
  history panel, the Mitigation Plan tab and the four lifecycle dialogs followed (next entry). Removing a threat or remediation still uses the
  browser's confirm, as before. The classic 2,552-line spec is ported (52 cases, plus one for
  Back). Checked live: a system risk (every tab, add and remove a threat, the link picker, Back
  before and after changing tabs) and a POA&M risk (created and deleted again). A risk page is in
  the axe run. **Found (API):** for a POA&M risk, `.../reviews` and `/api/risks/:id/score-history`
  answer 404 (the classic page asked for them too).
- **Risk page, the rest:** the four lifecycle dialogs (accept, review, review score, create
  mitigation), the score history panel (now the design-system line chart, baseline and residual
  as two series, with a table view) and the Mitigation Plan tab (each plan a disclosure with its
  status, task progress and tasks; create and edit dialogs) are design-system, transplanted in
  place with their scripts. The tasks panel and task dialog (`src/components/poam/`) are too:
  each task has a menu (mark in progress, completed or cancelled, edit, delete) and the
  "Responsible" picker lists every selectable user. **Found (fixed):** adding or editing a task
  never saved (the panel ignored the dialog's result). The risk page has no classic pieces left.
  Specs: the score history spec is updated; the tasks panel has a new one (including the save).
  Checked live on a throwaway POA&M risk: create a plan, add a task, mark it in progress (the
  plan and risk were deleted afterwards).
- **Implementation statement editor, part 1 (its smaller pieces):** the evidence counters (now a
  shared `EvidenceCounts`, the same status badges as the catalog tree), the risk count badge, the
  statement's facts, the components list and its menu, suggested components, the inherited
  responsibility rows, and the forms to link an evidence filter, create one from baseline
  evidence and create a component statement are design-system, transplanted in place (scripts
  kept). **Decisions:** the editor's classic component statement (`StatementByComponent`) is
  retired in favour of the drawer's design-system `ByComponentStatement`, which already did the
  same job; the "?" help tooltips on field names are dropped; an inherited block opens the
  statement from a "Manage responsibilities" button instead of a click anywhere on it. Pickers
  that held whole objects (an evidence filter, a component, baseline evidence) now hold IDs and
  map back, so the editor's script is unchanged. Specs adapted. The editor itself, its drawer and
  its four classic forms are next.
- **Implementation statement editor, part 2:** the per-control editor itself
  (`ControlStatementImplementation`), the implementation index around it, the statement create
  and edit forms, Import from SSP and Export statement are design-system, transplanted in place
  (scripts kept), and the control tree node no longer wraps them in `LegacyPage`. The unused
  `SystemImplementationComponentCreateForm` and `PartDisplay` are deleted. Still classic inside
  the editor: the shared-responsibility panel and blocks and the inherited-responsibilities
  section. Specs adapted (Export, Import, index). Checked live: the drawer opens the editor and
  saves.
- **Found (fixed): Implementation's evidence counts were blank** since part 1: both counters
  lost the import of the shared `EvidenceCounts`, so Vue rendered nothing (a warning, no error;
  type-check doesn't see unresolved components). A scan of every `.vue` file for tags that are
  neither imported nor global found no other cases (one classic workflow form, unchanged from
  `main`, uses an unregistered icon tag).
- **Catalog modals:** create group, create control, edit catalog, edit group, edit control,
  edit a control's statement, guidance or assessment objective, and edit a group's description
  are design-system dialogs, transplanted in place (scripts kept). The catalog page has no
  classic pieces left.
- **Configure System → Components:** each component's risks list is a design-system table
  (status, severity with likelihood × impact, review deadline, owner) with the status and sort
  pickers, and each risk is a link rather than a clickable card; New risk opens a design-system
  drawer. The evidence filters drawer lists linked filters in a table (with View evidence and
  Unlink in a menu) and reuses the Implementation editor's design-system forms to link or
  create one. **Cleanup:** the record collections (POA&M items, observations, risks, findings;
  system users, leveraged authorizations) all use design-system forms, so their classic
  fallback frame is gone. Specs adapted (catalog forms, risks list, evidence filters).
- **Configure System → Characteristics:** the edit form (name, short name, sensitivity,
  description, remarks) is design-system, with Cancel, a loading state and save errors shown
  in the dialog (the classic form ignored a failed save). New spec.
- **Compliance Map (`/lineage`), both tabs:** design-system, no islands left. The tree is a
  disclosure tree (a new design-system `Tree`/`TreeItem`: real toggle buttons with
  aria-expanded, children loaded on first open); the graph is drill-down columns (a new
  `ColumnBrowser`: labelled columns scrolling sideways). Each node shows its type, open-risk
  heat in words ("High open risk (30)", on the existing `heat-*` statuses), compliance spelled
  out, its posture in the selected SSP, inheritance, and the posture distribution as a bar
  with the same breakdown in text. The drawer (compliance, each SSP's status, inherited
  capabilities, linkage, risks by status, evidence) and the scope filters (system, component,
  types, Refresh) are rebuilt with the scripts kept. **Decisions:** the graph's hand-drawn
  connector arrows are gone; the card whose children are open is marked (strong border and
  accent) and its button reads "Hide children". Hover tooltips (control statement, bar
  breakdown) are replaced by visible text. Added to the axe run with mocked lineage data.
  Specs ported (tree, graph, summary, drawer, scope filters) plus specs for the two new
  design-system pieces. **Not cleaned up yet:** `components/lineage/nodeMeta.ts` and
  `heatScale.ts` still carry the classic Tailwind class strings beside the logic the map
  uses.
- **Unreachable code deleted (77 files).** A script followed imports by path from `main.ts` and
  the router (including the template-string import of the evidence record tabs) to a fixpoint
  and listed every file nothing reaches: the old dashboard widgets, the risk tabs and workflow
  task, activity and step forms from the pre-redesign pages, the POA&M and SSP forms the record
  pages replaced, Vue starter-template leftovers (`HelloWorld`, `TheWelcome`, icons), the old
  fetch client (`composables/api`), and unused stores. Their 13 specs went with them. Two unused
  design-system pieces (`FilterGroup`, `Split`) are kept as library parts. AGENTS.md no longer
  points at the deleted `PageHeader.vue`, `LabelList.vue` or `composables/api`.
- **Workflows have no classic islands left.** The definition Steps tab and the run page draw
  their step graph with a new design-system `FlowGraph`: the classic layered layout (each step
  right of what it depends on) ported to a pure helper, edges as SVG arrows, and each step a real
  button (name, role, status badge or "Evidence required"), so the graph works from the
  keyboard. Selecting a step on the Steps tab emphasises what it depends on. **Decision:** a
  run's embedded step definitions arrive without their dependencies, so the run graph falls back
  to step order, as the classic run view did; the step table beside it carries the same steps.
  The run's progress bar is dropped, since the facts above already count completed steps. The
  step panel (run page and My tasks), its evidence form and reassign dialog are rebuilt:
  status and dates as facts, failure and completion notes as messages, evidence asked for,
  submitted (with Download) and collected (with Remove), Start, Complete, Mark failed and
  Reassign in the drawer footer with the reason they're unavailable when they are. Mark failed
  is a confirm with the reason; Reassign picks from the selectable-users list (as the instance
  Roles tab does) instead of the classic search-as-you-type. Checked live on the failed
  Quarterly Access Review run and its definition: graphs, panel, no page errors. Specs ported
  (stubs and button names only) plus specs for `FlowGraph`, its layout and the reassign form.
  The Steps tab and a run page join the axe run, with mocked steps.
- **Configure System and the demo feedback button have no classic parts left.** The draw.io
  editor is an embedded frame either way; it lost its Tailwind class and its `LegacyPage`
  wrapper, gained a title for screen readers (axe's frame-title rule), and now has a fixed
  height (a new `--ds-height-embed` token, 640px) instead of the browser's default 150px
  iframe height. Not checked live: no system in local-dev has a diagram. The demo feedback
  button (public demo only) is a new design-system `FloatingButton` with a design-system
  dialog; Send explains why it's unavailable (empty or too long) instead of greying out. Its
  spec is ported (the test of the classic dialog's inline width is dropped: the design-system
  dialog sizes itself). `FormTextarea` is deleted, now unused. `.claude/worktrees/` is
  gitignored.
- **Admin Diagnostics has no classic parts left.** Notifications and AI suggestions are
  rebuilt as screens (`src/screens/admin`), split into sections, with the chart helpers now
  returning design-system `LineChart` series (the chart.js `LineChart` is deleted). Sections that
  were in-page buttons are tabs in the address (`?tab=health|deliveries|diagnostics`,
  `?tab=runs`), so they can be linked; each still loads the first time it opens. **Decision:**
  rows are no longer clickable; the job ID (Deliveries) or SSP name (Runs) is the button that
  opens the drawer, so it works from the keyboard. Busy buttons show a spinner instead of
  "Sending…"; while one destination is being removed, the other Remove buttons say why they
  wait. Copy is sentence case. `MetricTile` takes an optional link; new status keys for checks,
  jobs and providers. The unused `PageCard` and `FormInput` shims are deleted. Checked live
  against local-dev (notifications, all four tabs, a real delivery job; AI is off locally, so
  its enabled views are covered by specs and the axe run's mocks). All six diagnostics views
  join the axe run.
- **The agent Configuration tab is design-system.** The editor (about 6,000 lines) moved to
  `src/screens/agents/config`; the CodeMirror editor became a design-system `CodeEditor` with
  one theme built from tokens (so it no longer reconfigures when the theme changes). New
  design-system pieces: `InfoTip` (a focusable tip, replacing every `v-tooltip`, which keyboard
  users couldn't reach), `InlineTabs` (tabs that don't change the address, for the plugins),
  `ToggleChip` (the instance picker), a sticky-bottom `Panel` (the pending-changes bar), and
  `undo`/`moveUp`/`moveDown` icons. **Decisions:** every disabled control says why; the YAML
  viewers use `CodeBlock` (Copy and Download, hidden when there is no document); the raw YAML
  dialog uses the design-system dirty guard and now closes on Escape (asking first when there are
  edits); plugin install problems show as a text tag on the tab, with the reason in the card's
  tip; "Review & save" reads "Review and save". The editor's own fetching (debounce, 409/422
  handling) is kept rather than moved onto `useApiQuery`. Checked live against local-dev's
  todo-worker agent: Effective (summary), File, History, raw YAML and Add plugin; no page errors.
  The live check found long locked-key names (`REMOTE_CONFIG.TRUSTED_SOURCES`) running into the
  next column, so `DescriptionList` terms now wrap. The tab joins the axe run with a mocked
  instance.
- **The classic stack is gone.** With no classic page left, the teardown deleted `LegacyPage`,
  the vendored Volt wrappers (`src/volt`), PrimeVue and primeicons, Tailwind (its Vite plugin,
  config and the `main.css`/`base.css` imports), the global `PrimaryButton`/`SecondaryButton`
  and `v-tooltip`, and the dependencies nothing used any more: chart.js and its plugins, luxon,
  date-fns, sortablejs, heroicons, bootstrap-icons, tailwind-merge and autoprefixer. Toasts and
  confirmations moved off PrimeVue's event buses onto the design system: `useToast()` in
  `src/ds/toasts.ts` and `useConfirm()` in `src/ds/confirm.ts` take the same arguments the app
  already passed, so the change at about 200 call sites (and their spec mocks) was the import
  path only. The shell renders every page the same way; the classic-only remount on switching
  system went with the legacy frame (system pages take the system from their URL). AGENTS.md,
  `docs/TOOLTIPS.md` (now `InfoTip`) and this tracker describe the design system only. The Inter
  web font (classic pages only) is no longer loaded. **Tailwind's preflight reset had been
  doing work the design system relied on**: the axe run caught an input overflowing onto its
  Remove button (no `box-sizing: border-box`), and a layout and style comparison of 34 live
  routes with and without preflight found `Stack`/`Cluster` lists (`as="ul"`) gaining bullets
  and indents. The global `box-sizing` rule (in the mockup's base, dropped in the port because
  Tailwind supplied it) is back, and the layout lists reset their own list styles. After that
  the comparison shows no layout change on any route; the only visible differences are the skip
  link's underline (as in the mockup) and bullets in the notification health warnings.
- **The CCF logo is back.** The shell and guest pages showed a placeholder (an orange square
  beside "CCF"). A new design-system **`BrandMark`** draws the classic logo's mark (circular
  arrows around a tick, from `src/assets/logo-*-mini.svg`) inline in `currentColor`, so one
  file follows the theme instead of separate light and dark images. It sits beside the "CCF"
  wordmark in the header and on guest pages (larger there); the collapsed rail shows the mark
  alone (it used to show the wordmark alone). New tokens `--ds-size-mark-md`/`-lg`. The full
  classic logo (with "Continuous Compliance Framework ♥ Container Solutions") isn't used: at
  header height its small print is unreadable.
- **Inter, as in the classic app.** Look and feel now moves towards the classic design. Text was
  set in JetBrains Mono (interface) and Space Grotesk (headings, metrics, prose); all of it is now
  Inter, self-hosted as a variable font with optical sizing (`@fontsource-variable/inter`, the
  same axes the classic app requested from Google Fonts). JetBrains Mono stays for code: the
  `code` text variant and `<code>`/`<kbd>`/`<samp>` used the interface font, which happened to be
  the mono, so they now use the code font explicitly. Space Grotesk is uninstalled. Uppercase,
  letter-spaced buttons, labels and column headings (a monospace convention) are unchanged here.
- **No top bar.** The header existed only for the logo and the account menu. On wide screens
  (expanded nav and rail) the logo now heads the navigation, and the account menu (preferences,
  theme, sign out) sits at its foot beside the collapse button, opening upwards (to the side in
  the rail, where it shows only the avatar). Below 1024px the navigation is a drawer, so a slim
  top bar stays for the menu button, mark and system switcher; the account menu moved into the
  drawer's footer. The account trigger is its own component (`AppShell/AccountMenu.vue`), and
  `Menu` gained `side="top"`. Its accessible name is unchanged ("Account menu, <name>").
- **White panels, a navy nav and a blue accent.** The palette was Catppuccin (grey panels on a
  grey page, an amber accent). Now the page is light grey, panels, dialogs and menus are white,
  text is slate, and the accent (primary buttons, focus, the current item and tab) is a bright
  blue. The navigation's background is the logo's navy (#0c243e), the CCF brand colour: a
  `.ds-scope-nav` class in `color.css` re-points the general colour roles at nav-specific ones,
  so the nav, its system switcher, account button and the drawer recolour without component
  changes, while menus opened from the nav stay white. Dark mode keeps the same structure
  (panels lighter than the page) on slate. The mockup's contrast check never came across with
  the tokens; it is now `scripts/check-ds-contrast.mjs`, run by `npm run lint:css`, and tests
  200 colour pairs in light, dark and the nav scope (it fails on a deliberately bad value). Chart
  series 2 moved from info blue to warning orange so it stays distinct from the blue accent.
- **Content on white.** With panels white, anything placed straight on the page showed grey. The
  cause was systemic: in the Catppuccin palette the page colour (`surface-base`) was the lightest
  surface, so components wanting a light background used it. `DataTable` (35+ routes) and
  `Pagination` now use the panel colour. An audit of every route (the axe run's mocked routes and
  49 live local-dev routes) then flagged content with no white behind it: the configure
  Components tab, a catalog's groups and controls, This System > Implementation's controls, the
  workflow run's progress, a system template's details and About. Each now sits in a `Panel`
  (Components keeps "New component" in the panel header). **Decision:** no card style was added
  to `Disclosure`: `Panel` is the one white section (it replaced ten card styles), and AGENTS.md
  now says content sits in one. Left on the page: table captions (headings above each table) and
  a risk's statement under its title.
- **Disclosure chevrons lead.** On a wide row the chevron sat at the far right, easy to miss
  beside a short label. It now leads the label, pointing right when closed and down when open.
  The sidebar's nav groups (`variant="nav"`) keep theirs at the end, since their icon leads.
- **Panel actions sit beneath the title, and are smaller.** A panel's header actions (e.g. "Add
  diagram") sat at its far right, easily missed on a wide screen with the content on the left.
  `Panel` now stacks them under its title and description, and a new `ButtonSizeScope` (which
  `Panel` wraps them in) makes their Buttons and IconButtons default to the small size; a
  button's own `size` still wins, and buttons in a panel's body are unchanged. This applies to
  every panel with actions (34 screens), with no screen changes. Selects and links in the actions
  move too but keep their size.
- **Buttons in sentence case.** `Button` dropped its uppercase, letter-spaced label style (a
  monospace convention) for sentence case at body size, semibold, as the classic app had: "Add
  diagram", not "ADD DIAGRAM". Labels were already written in sentence case; the one in Title Case
  ("Use Template") is now "Use template". Field labels, tabs, table headings, status badges and
  nav items keep their capitals for now.
- **Evidence pages resize instantly again.** This System > Evidence took about 3 s per resize:
  the page had 85,009 elements, 84,588 of them in the Agent health chart, which plotted all
  42,171 heartbeat buckets the API returns (every 2 minutes since local-dev started; 2.2 MB, no
  time range). `LineChart` found each point's position with `indexOf` (quadratic) and drew a
  marker per point, all redone on every resize. Now: Agent health shows the last hour, as the
  status trend beside it does (`heartbeatSeries` filters; e2e mocks are relative to now);
  `LineChart` looks positions up in a map, builds its table rows from maps, and draws only the
  line above 120 points per series (a safety net for any chart). The page has 739 elements and
  12 resizes take 0.4 s instead of 36 s. **API to-do:** `/api/agent/heartbeat/over-time` needs a
  time range; the UI still downloads 2.2 MB per visit and it grows by ~720 buckets a day.
- **Subject filter is one type-to-search field.** The evidence page's subject filter was a
  search box plus a separate dropdown of its results (two steps for one choice). `Combobox`, the
  design system's existing type-to-search field, only filtered options it already held; it gains
  `remote` (it emits `search` with the typed text and shows the caller's results unfiltered, for
  server searches such as `GET /api/subjects`) and `clearable` (a × once something is chosen; an
  option's value can't be empty, so "Any subject" became "nothing chosen"). The subject filter
  now uses both; choosing still sets the URL and the chip. New spec: `Combobox.spec.ts`.
- **Evidence filters lose their disclosures.** Subject sits beside the search, always shown.
  The Columns disclosure is gone: the Labels column always shows (it can no longer be hidden),
  and an eye button in its header, "See hidden labels", toggles the system labels (`_agent`,
  `_policy`…). It is light when off and bold when on. New in the design system: `DataTable`
  `header-<key>` slots (a control after a column's title), `IconButton` `pressed` (an on/off
  toggle, `aria-pressed`, bold when on), `Icon` `weight` and the `show` (eye) icon. The classic
  page's `showLabels` store setting is no longer read by this screen.
- **Status trends in green and red.** Satisfied and not satisfied were the first two chart
  colours (blue and brown), by position. `LineChart` series take an optional `tone` (`success` or
  `error`), drawn in the status colours the badges use; `statusSeries` sets them, so the evidence
  pages and saved-filter trends both change. The circle and square markers stay, so the lines
  don't rely on colour alone.
- **Evidence status as a dot.** The Status column repeated "SATISFIED" / "NOT SATISFIED" badges
  on every row. `StatusBadge` gains `dot`: the status icon as a filled circle in its tone colour
  (green, red, grey for unknown) with its symbol (tick, cross, question mark) in white, the label
  in a tooltip on hover and in hidden text for screen readers. **Decision:** not a plain coloured
  circle, which would be colour alone (red/green is the commonest colour-blind confusion, and a
  hover tooltip doesn't reach touch or keyboard users); the symbol keeps it readable without
  colour. Other tables keep the full badge.
- **Tags lose their border.** The bordered boxes in the evidence table's Subjects and Labels
  columns were noisy. `Tag` (72 files) is now a borderless grey chip, like inline code in an
  editor, on the neutral tint (`status-neutral-bg`; the old sunken grey nearly vanished on white
  without a border). `Tag` gains `code` for the monospace font, used for evidence labels
  (`key=value` is search syntax); subjects are names and keep the UI font. Added/removed tags keep
  their tints.
- **Saved filters and view filters, separated.** The evidence page's filter bar is now only the
  search, which is what "Save as filter" saves; the button moved from the page header to beside
  Search (secondary, so it doesn't outshout it) and saves what's in the box, run or not, once it
  checks out. The subject filter, which a saved filter can't hold (the API's filter is a label
  expression), moved to the Subjects column's header: click the title and it becomes the subject
  search; the choice shows in the header as `subject = <name>` with a clear button; Escape or
  leaving restores the title. The URL, Share and CSV export still include it. When nothing
  matches, the empty state still names the subject and clears it (the header isn't shown then).
  New in the design system: `ColumnFilter` (for a `header-<key>` slot, which now replaces the
  column title), `FilterBar`'s `search-actions` slot, and `Combobox` `v-model:open`.
  **Known issue (not new):** a list reload swaps the table for a skeleton, so keyboard focus is
  lost after choosing a subject, as it already is after sorting; keeping the table up, marked
  busy, while it reloads would fix both.
- **Implementation: Controls and Profiles are tabs.** The Profiles panel sat above the controls
  list on every visit. Now Controls (the default: search, "Apply all suggestions" and the list)
  and Profiles (`?tab=profiles`, like other in-page tabs) are `ListTemplate` tabs. With no profile
  attached, the Controls empty state points to the Profiles tab with an "Attach profiles" button.
  The screen's button, dialog and toast titles are now in sentence case ("Apply all
  suggestions"); other screens still have Title Case toast titles.
- **Side navigation: no "This System" heading.** The system's links sit indented in a box under
  the system selector, which already groups them, so the heading went. The selector's small
  label now reads "Selected system" instead of "System". Screen readers still hear the list as
  "System: <name>".
- **Implementation: control → implementation → evidence (first version, an experiment).** Inside
  the profile and group disclosures, each control is now three linked boxes, with arrows between:
  **Control** (ID, title, and the statement cut to three lines with "Show more"; risks and
  suggestions), **Implementation** (the start of its ID, its remarks, then each component's title,
  implementation status and statement for this control; Details opens the drawer as before) and
  **Evidence** (the control's evidence counts, then each evidence filter that checks it, linking
  to its evidence). The column labels sit once above each group's controls. When the content area
  is narrower than 840px (phones, or a narrow window), the boxes stack, each shows its label, and
  the arrows point down. The statements editor is unchanged, in a closed disclosure under each
  row. New in the design system: `LinkedColumns` (with `LinkedColumnsHeader`) and `ClampedText`.
  The page makes two more requests, once each: the plan's components and its filters. The
  filters reload when a statement editor closes, since linking a filter happens there.
- **Implementation: profiles are a filter, not disclosures.** Beside the controls search,
  "Include controls from" lists the attached profiles with a checkbox each, all ticked at first
  (shown when there is more than one). The controls are no longer nested in profile and group
  disclosures: each catalog group is a titled section in the Controls panel, with its control
  count, and groups the profiles share are merged, so a control in two profiles shows once.
  Nested groups are sections of their own ("Parent › Child"). A profile attached later is ticked; the choice isn't
  kept when you leave the page. An imported requirement is still highlighted, but there are no
  disclosures left to open for it.
- **Implementation: components grouped by statement.** The Implementation box no longer shows a
  fragment of the implementation's UUID. Under the remarks, it lists the implementation's
  statements by their statement ID (`ac-2_smt.a`, `ac-2_smt.b`, …, in the catalog's order; a
  control without lettered parts has one, e.g. `INT-CI_smt`), each with its remarks and its
  components; components that implement the whole control come first, under "Whole control".
  A statement with no component says so, and a control with no implementation says "Not
  implemented yet."
- **Implementation lists top-level controls only, and no withdrawn ones.** The resolved profile
  from the API includes every enhancement of each chosen control (FedRAMP Low resolves to 135
  controls plus 529 enhancements, though it chooses only a few) and the withdrawn controls, so
  listing enhancements showed hundreds of controls the system doesn't implement. **API to-do:**
  profile resolution should keep only the enhancements a profile includes (`with-ids`, or
  `with-child-controls`). Until then, an enhancement the profile does choose (e.g. `ia-2.1`) isn't
  listed; its implementation is still reachable through the API and the old views.
- **Test data: "Layout Test System"** (local API only; added 2026-11-19 for the Implementation
  page). Imported the NIST SP 800-53 rev 5 catalog and the FedRAMP Rev 5 Low profile from
  `demo/oscal-content`, a small overlapping profile ("Layout test — access extras"), and a new
  SSP with six components and implementations for ac-1, ac-2 (seven statements, a whole-control
  component, every implementation status), ac-17, au-6, ia-2, ia-2.1 and cm-6, plus eight evidence
  filters named "Layout test — …". Nothing existing was changed. The generator script and files
  are in the session scratchpad, not the repo.
- **Implementation: summary rows and a control view (step 1).** A principle for this page: the
  list summarises, and a control's full content is in its own view. Each row now shows the
  control's ID and title (a link), its risks and suggestions; how much of it is implemented
  ("Statements for 6 of 12 parts"), its components by status ("5 implemented, 2 partial") and
  which components; and its evidence counts and how many filters. The title, or a click anywhere
  else on the row, opens the control's view: a sheet over nearly all of the page, in the address
  as `?control=ac-2` (Back closes it; a link opens it). The view sets the control's statement
  beside its implementation part by part: each lettered part (`ac-2_smt.a`) with its full text on
  the left, and the statement for that part on the right, every component with its full text and
  status, or "Nothing written for this part yet". Components that implement the whole control come
  first; statements matching no part come last. Catalog parameters are written out as NIST prints
  them ("[Assignment: organization-defined time period]"). Evidence filters link to a control, not
  its parts, so the evidence is a section of its own below. The editors (the statements editor and
  the drawer, now "Components and sharing") are in the view's Edit section until step 2 moves
  editing into the parts. New in the design system: Drawer `size="wide"`; LinkedColumns takes two
  or three columns and `to` (a click on the row opens it); a dialog or drawer body is now a size
  container, so content inside responds to the sheet's width. `ClampedText` is no longer used on
  this page.
- **Implementation control view: catalog links and editing in place.** Each part's control box
  has an icon link that opens the control in its catalog in a new tab: the catalog page now
  takes `?control=ac-2&groups=ac`, opens those groups and the control, and scrolls to it once
  loaded. The catalog is found from the profile that brings the control in (its import's
  back-matter link); with several catalogs in one profile, the first is used. Each
  implementation box has an edit icon that turns it into a form in place, no further drawer:
  each component's status and text, remove a component, and add one of the plan's components.
  Saving creates the control's implementation and the part's statement first if they don't exist
  yet, then updates, adds and removes components (keeping a component's other fields, e.g. what
  it shares). One part is edited at a time, and closing the view with a form open asks first.
  Limits, from the API: a component can't be added to the whole control (only to a part), and
  statement remarks aren't editable here yet (the statement update would need checking for
  whether it replaces the components). The search label is now "ID and title filter".
- **Implementation control view: link, don't add, components.** Each implementation box starts
  with a "By component" label (and its edit icon), so it's clear each entry is a component.
  Editing now offers "Link a component": a type-to-search list of the plan's components (not
  those already on the part), refreshed each time it opens. Components are made where they live:
  beside the search, "Create a component (opens in a new tab)" goes to Configure System →
  Components with the new-component form open (the page takes `?create=1`), then the search
  finds it without reloading the view.
  In the form, each component's remove button is now an unlink icon ("Unlink Okta workforce
  identity"): it takes the component off the part, not out of the plan. New in the design
  system: the `unlink` icon.
- **Catalog: a control's statement, item by item.** The statement was one run of text (the
  sub-parts joined into markdown that rendered as a paragraph). It is now an outline: each
  top-level item (a., b., c.) on its own, divided by a rule, with its sub-items (1., (a)) indented
  under it, so the catalog shows the same items the implementation view maps components to. Each
  label shows the item's ID on hover and focus (`ac-1_smt.a`). Guidance and objectives are as
  before. The API keeps parts as a nested tree at any depth (a JSON column on the control); the
  deepest statement in NIST 800-53 is the "-1" controls' (ac-1_smt.a.1.a, four levels). New in the
  design system: `Outline` (labelled items, nested, with an optional hint per label).
- **Catalog: a control ID already in the catalog is refused.** Adding a sub-control to ac-1 with
  the ID ac-1 made ac-1 its own parent, and it vanished from the catalog (both front ends). The
  API doesn't refuse an existing ID: its sub-control create appends through gorm, which repoints
  the existing row's parent instead (title and parts survive). The create form now checks the ID
  first and says "ac-1 is already in this catalog…". The catalog tree also skips a control listed
  as its own sub-control, which would otherwise nest forever. API to-do: refuse an existing ID
  (409) on all three control-create endpoints.
- **Implementation control view: parts at every depth.** The API takes an implementation
  statement for any part of a control's statement (its statement ID is just the part's ID), and
  the classic editor offers every part, depth first. The view now does too: one row per part at
  any depth (ac-1 has ten: a, 1, (a), (b), 2, b, c, 1, 2), each with its own edit button, nested
  parts indented under their parent. A statement for a deeper part (`ac-1_smt.a.1.a`) used to
  land in "No part of this control has this ID"; it now sits in its row. Each row's control text
  is the part's own, without its sub-parts. The list row's "Statements for X of Y parts" counts
  every depth. New in the design system: LinkedColumns `depth` (1 to 3): side by side, the first
  box indents and the other columns stay aligned; stacked, the whole row indents by a smaller step.
- **Implementation control view: tidier boxes.** With a row per part, the catalog icon on every
  control box was the same link many times over: it's now one link at the top, "See ac-1 in its
  catalog (opens in a new tab)". An implementation box shows the statement's remarks, if any,
  then "By component" only when there are components (or while editing them). The edit button
  sits beside the box's text instead of on a row of its own, so an empty part is one line.
- **Implementation list: a row per control, in family disclosures.** The three linked boxes per
  control (control → implementation → evidence) didn't work as a list, so each control is now one
  row: its ID and title (a link that opens its view), the start of its statement, and at the end
  its open risks, suggestions, how much is implemented ("7 of 21 parts · 5 implemented, 2
  partial…", or "Not implemented yet"), its evidence filters and evidence results. Controls are
  grouped by family (catalog group), each a disclosure; which families are open is remembered per
  system, and a search opens them all.
  Rows in a closed family aren't rendered, so they don't fetch their evidence. `ControlLinkRow`
  is gone; the control's view keeps LinkedColumns for part beside implementation. Design system:
  ItemList's trailing content can now shrink and wrap on a narrow screen.
- **Implementation control view: Edit section removed, with the old drawer.** The view's last
  section held the classic statements editor and a "Components and sharing" button into the old
  implementation drawer. Both are gone, with every file only they used: the statements editor
  and its forms, the import-from-SSP and export dialogs, the Shared responsibility panel,
  inherited responsibilities, the drawer's component statements and AI suggestions panel, two
  composables, and the drawer's state in the UI store. **No longer reachable on this screen:**
  per-control AI suggestion review (the page's "Apply all suggestions" stays, and rows still
  count suggestions), shared responsibility (what a component provides; importing an upstream
  implementation, and the "Just changed" highlight it set), per-statement risk links, and
  statement export/import. Each needs rebuilding into the control's view if wanted.
