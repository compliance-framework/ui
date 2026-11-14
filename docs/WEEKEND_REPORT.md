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
  users, groups, parties and roles; system templates list; POA&M items; evidence filters list;
  control links (list and create); control evidence; My tasks; Preferences; About; and every
  signed-out page.
- **Design-system page with classic islands inside**: Implementation, Configure System, the
  seven record pages (their tabs), catalog page, user and group pages, workflow run, Compliance
  Map, Diagnostics, risk page, system template record, New evidence filter.
- **Design-system header over a classic body**: Agents, risk and subject templates, Import,
  Inventory, Build a profile from props, Filter suggestions.

App-wide pieces are design-system too: **toasts, confirmations and the error dialog** (the
classic `useToast()` and `useConfirm()` calls are bridged, so nothing PrimeVue is mounted
globally any more). Rebuilt record tabs and sections include every JSON tab, the four OSCAL Overview tabs, the
profile's Controls, Compliance and Merge, the whole workflow definition record, workflow instance
Overview and Runs, assessment plan Tasks, component definition Back matter, and Configure
System's Overview, Characteristics and JSON. A live sweep of every page (66 routes plus every
Configure section) is clean apart from API errors listed below.

The full list of islands still to replace is in `docs/REDESIGN.md` → Legacy islands, and per
page below.

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
test CD", and a profile "Weekend version probe" (the API can't delete those). Every other record I created was deleted again.

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
- **Gap (island):** the inline implementation editor, evidence counter, component statements,
  suggestions panel, shared responsibilities and export dialog are classic islands.
- **Decision:** island-heavy pages are not in the axe browser checks yet (the islands would fail
  on classic issues that their rebuild will fix).

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
