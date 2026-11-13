# Weekend report (2026-11-14 → 2026-11-16)

Autonomous migration work on `poc/redesign-foundation` while you were away. Each section is one
commit (or a few), with the decisions I made to keep moving. Nothing was pushed. The tracker in
`docs/REDESIGN.md` has the overall state; this file is the narrative and the calls to review.

How to read it: **Decision** lines are judgement calls you may want to reverse. **Gap** lines are
things a migrated page doesn't do yet. **Found** lines are bugs or oddities in the classic app or
the API that I noticed along the way.

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
