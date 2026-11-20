# Redesign

Branch `poc/redesign-foundation` moves the whole UI onto the design system from
`ccf-mockup-redesign`, page by page, in one go (a "big bang"): the branch merges when every page
is migrated. There is only ever one version of a page. A migrated page takes over its route, or
its old route redirects to the new one, and the old page is deleted. Pages not yet migrated still
work, inside the new shell, until their turn.

## Try it

```sh
npm run dev
# against local-dev while its containers hold port 3000:
VITE_API_PROXY=http://localhost:8080 npm run dev
```

## How it fits together

| Path                 | What it is                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ds/tokens/`     | Design tokens, all prefixed `--ds-`, and the global element defaults.                                                                                             |
| `src/ds/components/` | Shared components from the mockup (Button, DataTable, DataState, FilterBar, Menu, Dialog, Tabs, LineChart, CodeBlock, layout primitives…), on reka-ui and Lucide. |
| `src/ds/templates/`  | `AppShell` (the app's only frame: nav with mark, system switcher and account menu) and `ListTemplate`.                                                            |
| `src/ds/query.ts`    | `useApiQuery`: `useDataApi` mapped to the DataState states (loading, ready, empty, error, forbidden).                                                             |
| `src/screens/`       | Migrated pages. Screens compose templates and components and contain no CSS or class attributes.                                                                  |

Routes in `src/router/index.ts`: pages are in `designSystemRoutes` with `meta.ds` (from the
migration; every page has it now). System pages take the system from their URL.

### Migrating a page

1. Build the screen in `src/screens/<area>/` from `src/ds` components (see `AGENTS.md`).
2. Give it its route in `designSystemRoutes` with `meta.ds: true`. Use the new URL scheme (below),
   and turn the classic route into a redirect if links elsewhere use its name.
3. Delete the classic page, its now-unused components and their specs. `git show main:<path>` has
   them for reference.
4. Add the route to `e2e/a11y.spec.ts` and its API calls to `e2e/support/api.ts`.
5. Tick it off in the tracker below.

### URL scheme

- System pages put the system in the URL: `/systems/:systemId/<section>`. `SystemScope` loads the
  system named in the URL and makes it the current system, so a shared link sets the reader's
  current system, and classic system pages (which read the system store) stay in step.
- Records under a system: `/systems/:systemId/<section>/:recordId/<tab>`, each tab its own route.
- A record also reachable from global pages gets a system-less route too (as the evidence record
  does at `/evidence/:evidenceId`), sharing the same screen.
- A system or record the user can't read shows as not found (the API has no per-system 403 yet).

## Tracker

Tabs and nested pages move with their parent. **Done** means migrated, with the old page deleted.

| Area                                                                                             | Classic routes                                                                                               | Status                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell (layout, nav, system switcher, account menu, theme)                                    | the classic `App` layout, `LeftSideNav`                                                                      | **Done**                                                                                                                                                               |
| Systems list                                                                                     | `system-security-plans` → `/systems`                                                                         | **Done**, with New system (shared document form)                                                                                                                       |
| This System > Evidence                                                                           | `system:evidence` → `/systems/:id/evidence`                                                                  | **Done**                                                                                                                                                               |
| Evidence record                                                                                  | `evidence:view` → `/evidence/:id`, `/systems/:id/evidence/:id`                                               | **Done, with one gap:** policy playback isn't rebuilt (the page says so)                                                                                               |
| Global > Evidence                                                                                | `evidence:index` → `/evidence` (same screen as This System > Evidence)                                       | **Done**                                                                                                                                                               |
| Evidence create, re-submit, history                                                              | `evidence:create`, `evidence:update` (one form screen), `evidence:history` → the latest record's History tab | **Done**                                                                                                                                                               |
| This System > Implementation                                                                     | `controls:index` → `/systems/:id/implementation`                                                             | **Done**: frame, profiles, control tree, drawer, the per-control editor and its forms, and shared and inherited responsibilities                                       |
| This System > Compliance                                                                         | `compliance:index` → `/systems/:id/compliance`                                                               | **Done**                                                                                                                                                               |
| This System > Risks: dashboard, register, new and edit risk                                      | `risks:index` → `/systems/:id/risks` (dashboard) and `/systems/:id/risks/register`                           | **Done**, plus the cross-system register (`/admin/risks`) and the risk page (`risks:detail`, design-system throughout)                                                 |
| This System > Workflow Instances (list, New instance)                                            | `workflow-instances:index` → `/systems/:id/workflows`                                                        | **Done**; instance page and run page on the design system, with the step graph (`FlowGraph`) and step panel                                                            |
| Configure System (15 tabs)                                                                       | `system:*`, `system-component-dashboards` → `/systems/:id/configure/...`                                     | **Done**: every section is design-system (the draw.io editor is an embedded frame); the old Control Implementation section redirects to Implementation                 |
| POA&M items, inventory                                                                           | `poam-items:index`, `inventory:index`                                                                        | POA&M items **done**; inventory **done**                                                                                                                               |
| SSP editor (16 tabs)                                                                             | `system-security-plan-*` → Configure System (sections), Risks, Compliance                                    | **Merged into Configure System**; SSP create **done**                                                                                                                  |
| Evidence filters (dashboards)                                                                    | `dashboards`, `dashboards.*`                                                                                 | List **done** (trend in a drawer); New filter and Suggestions **done**                                                                                                 |
| Analysis: cross-system risks, compliance map                                                     | `admin-risks`, `lineage`, `lineage-graph`                                                                    | Cross-system risks **done**; Compliance Map **done** (tree, graph, scope filters and drawer)                                                                           |
| Integrations: workflow definitions, agents, import                                               | `workflow:index`, `workflow-definition-*`, `admin-agents`, `admin-import`                                    | Workflow definitions list **done**; definition record **done**; agents (every tab, the Configuration editor included) and import **done**                              |
| Control Definitions: catalogs, profiles, control links, component definitions                    | `catalog-*`, `profile*`, `control-links-*`, `component-definition*`                                          | Lists of catalogs, profiles, component definitions; catalog page; control evidence; control links; create catalog, profile, component definition; build-props **done** |
| Assessment plans, assessment results                                                             | `assessment-plan*`, `assessment-results*`                                                                    | Lists, create and edit **done** (shared form); records **done**                                                                                                        |
| POA&M documents                                                                                  | `plan-of-action-and-milestones*`                                                                             | List, create and edit **done** (shared form); record **done**                                                                                                          |
| Admin: users, groups, parties, roles, templates (SSP, subject, risk), diagnostics, notifications | `users-list`, `user-view`, `admin-*`                                                                         | Users, groups, parties, roles; user and group pages; system templates; Diagnostics; subject templates (list and page); risk templates **done**                         |
| My tasks, preferences, about                                                                     | `my-tasks`, `preferences`, `about`                                                                           | **Done**                                                                                                                                                               |
| Sign-in, password reset, SSO and Slack callbacks (guest layout)                                  | `login`, `forgot-password`, `password-reset`, `sso-callback`, `slack-link-callback`                          | **Done**: new `GuestTemplate`; scripts kept from the classic pages                                                                                                     |

The last classic page has gone, and with it `LegacyPage`, PrimeVue, Volt, Tailwind, primeicons,
chart.js and the classic shims. Dropping the `--ds-` prefix is optional.

## Legacy islands

During the migration some pages embedded classic editors (inside `LegacyPage`) until they were
rebuilt. None are left.

Rebuilt so far (no longer islands): the agent Configuration tab and its editor, Admin Diagnostics (notifications and AI suggestions), every JSON tab, the four OSCAL Overview tabs, profile
Controls, Compliance and Merge, workflow definition Overview, Steps (table) and Controls, workflow
instance Overview and Runs, assessment plan Tasks list, every visible Configure System tab
(Overview, Characteristics, Authorization Boundary, Components, Scope, JSON), component
definition Components, Capabilities and Back matter, every POA&M tab, assessment results
Results, workflow instance Roles, Configure System Users, Leveraged Authorizations, System
Implementation, Leverage, Inherited Capabilities and Export Offerings; the Implementation drawer's
AI suggestions, component statements and shared responsibility; the statement editor's inherited responsibilities; assessment plan Tasks (with activities, steps and the task form); the user and group pages' members and roles; Build a profile from props; Scope's label-condition fields; the subject templates list and page; the catalog control tree; the profile control-group editor and catalog import dialog; the run page's step table and timings; the workflow step form; the system template's preview and created-systems table; Inventory; Import (OSCAL and evidence filters); the export offering items editor and the subscribe form; the Slack link section on Preferences; the subject template form and preview; the system template form; the workflow import panel; the inventory create and relationships forms; the evidence filter form; the risk page (every tab, panel and dialog); Agents (list, record, keys); risk templates; Filter suggestions (with the generate and edit forms); toasts,
confirmations and the error dialog app-wide.

## To-dos

Small things noticed along the way, to sweep up later:

- Compliance: the six totals wrap to two rows at 1440px; a compact tile row would fit them on one.
- The classic Compliance page read `uuid` from `GET /ssp/:id/profiles`, but the API returns `id`,
  so on `main` it may never find the attached profiles. The new page accepts both. Worth checking
  on `main`.
- The classic "Select a system" prompt (classic system pages) still uses classic styling.
- Workflow instance pages (`/workflow-instances/:id`) highlight no nav item; they belong under
  `/systems/:id/workflows/:instanceId` once their tabs are rebuilt.
- Classic risk detail (`/risks/:id`, `/system-security-plans/:id/risks/:id`) highlights no nav
  item, because its URL is outside `/systems/`. It will once risk detail is migrated under
  `/systems/:id/risks/:riskId`.
- Browser checks can fail on the first run after new imports, while Vite re-optimises its
  dependencies and reloads the page; a second run passes. Pre-bundling the dependencies
  (`optimizeDeps.include`) for the e2e server would stop it.
- Workflow Instances for one system lists instances named after other systems (live data). The
  classic page sent the same `system_id` filter, so check whether the API applies it.

## Decisions

Agreed with the product owner (2026-11-13):

- **Big bang on this branch.** Pages are replaced, not run side by side; merge conflicts with
  `main` are accepted as the cost of moving fast.
- **Navigation stays true to the current app** (structure and labels): This System, then Global
  with Evidence, Analysis, Integrations, Control Definitions and Admin. This System is always
  shown, as in the classic app; with no system chosen it says so, and its pages ask for one.
  Its group has no "This System" heading: the system selector (labelled "Selected system") and
  the indented, boxed links under it already show the grouping.
  **All systems** is listed under Global (an addition: the classic app reached the list only
  from its system menu).
- **The system lives in the URL**, identified by SSP UUID; opening a link makes it the current
  system.
- **The Systems list matches the current app's columns** (no per-system summary endpoint).
- **A forbidden system is shown as not found.**

Made during the work (open to review):

- **Components are copied from the mockup, not shared.** This repo's `src/ds` is now the source of
  truth. Changes from the mockup: `DataState` reads the signed-in user from the auth store;
  `format.ts` uses the real clock; `Menu/menu.ts` became `menuEntries.ts` (vue-tsc 2 case clash);
  `CodeBlock` uses the app's toasts; the mockup's prototype-only pieces were left out.
- **API access stays on the existing axios client** (`useDataApi`, `useAuthenticatedInstance`), so
  camelCasing, cookie auth and the 401/403 handling are unchanged. No new data library yet.
- **Dark mode uses the existing `.dark` class and `useTheme`**; the shell's account menu changes
  it. The classic floating theme button is gone.
- **Toasts use the design system's `ToastRegion`** (ported from the mockup), mounted once in
  `App.vue`. Scripts raise them with `useToast().add({ severity, summary, detail })` from
  `@/ds/toasts`, the shape the app's PrimeVue calls used, so the call sites didn't change. Success and info dismiss after 5 s; warnings and
  errors stay until dismissed (the `life` a call site passes is ignored).
- **Confirmations use the design system's `ConfirmHost`** in `App.vue`, which shows
  `useConfirm().require(...)` requests (`@/ds/confirm`, PrimeVue's option names) as
  ConfirmDialogs. New screens use
  `ConfirmDialog` directly.
- **Wording follows the current app**; the status vocabulary in `StatusBadge/statuses.ts` is used
  where it matches (evidence results, risk statuses and levels).
- **Times show in the viewer's local time zone**, as the current app does.
- **Risks:** Dashboard and Register are route tabs; the register keeps the classic filter
  parameters (so control badges and dashboard drill-downs still land filtered) and adds sort to
  the URL. Bulk actions and paging were only on the cross-system register, so they're not here.
  Risk template helpers moved to `src/utils/risk-templates.ts` and owner lookups to
  `src/utils/risk-workflow.ts`, shared with the classic forms.
- **Evidence pages:** URL parameters keep the classic names (`filter`, `page`, `sortBy`,
  `sortDirection`, `subject`) so old links still work; CSV export shares
  `src/utils/evidence-csv.ts`; Global and This System > Evidence are one screen (`EvidenceScreen`) in two contexts; trends use the accessible `LineChart`
  (with "Show as table") below the list; the subject picker narrows system components to the
  current system; record tabs are routes; tasks are listed in place rather than in a dialog.
- **Implementation lists a row per control, by family** (2026-11-19). Three linked boxes per
  control (control → implementation → evidence) were tried first and dropped: in a list they
  were heavy and hard to scan. Each control is one row (ItemList): ID and title, the start of its
  statement, and at the end its risks, how much is implemented, its evidence filters and results.
  Controls are grouped by catalog group (family), each a Disclosure, remembered open per system;
  a search opens them all. The profiles are not disclosures: "Include controls from" ticks them
  beside the search (all ticked at first); a control in several profiles shows once. Only
  top-level, current controls are listed: the API's resolved profiles include every enhancement
  and withdrawn control.
  A control's view (a drawer) holds its parts beside their implementation, and its evidence; its
  old Edit section (the classic statements editor and the "Components and sharing" drawer, with
  AI suggestions per control, shared responsibility and per-statement risks) was removed on
  2026-11-20, with its code. Those features return only when rebuilt into the view.
  The whole row is the control's link (ItemList `rowLink`, a stretched title link). The row names
  each implementing component with its status rather than counting statuses, and evidence
  results are a `StatusCapsule` (green, grey, red segments with counts, as in the classic UI).
  Each row has two lines with their own ends: ID (a code chip, as in the evidence table) and title, then risks, filters and
  evidence; the statement's start, then the parts count and components with their status.
- **List pages summarise; a record's full content has its own view** (2026-11-19, from the
  Implementation page). A row shows counts and names, not text; its title (a real link), or a
  click anywhere else on it, opens the record in a wide Drawer whose state is in the address
  (`?control=ac-2`), so Back closes it. There, a control's statement is set beside its
  implementation part by part (`LinkedColumns`), at every depth, with nested parts indented.
- **The evidence form** uses native date inputs (local calendar dates, sent as local midnight as
  before), validates on submit with errors beside fields and a summary, keeps entries when a
  save fails, and keeps Re-submit's stream UUID and labels. Subjects are added and removed as a
  list.
- **Look and feel moves towards the classic app** (2026-11-17), on the design system: the
  classic logo mark replaces the placeholder, and all text is set in Inter, as before (self-hosted
  variable font). JetBrains Mono stays for code, identifiers and queries; Space Grotesk is gone. There is no
  top bar on wide screens: the logo heads the navigation and the account menu sits at its foot
  (in the drawer's footer on narrow screens, whose slim top bar keeps the menu button). Colours: a light grey page with white panels, the logo's navy as the navigation's background (the CCF brand colour, via the `.ds-scope-nav` colour scope) and a bright blue accent for primary actions, focus and the current item; `npm run lint:css` checks every colour pair's contrast.
- **ESLint's `vue/multi-word-component-names` is off for `src/ds/**`**; components are namespaced
  by folder. Copied files use the repo's Prettier settings.

## Checks

- `make reviewable`: format, type-check, ESLint, `lint:css` (stylelint: `src/ds` and
  `src/screens` use tokens only; `scripts/check-ds-tokens.mjs`: every custom property they read
  is a `--ds-` token or a known local one) and unit tests.
- `npm run test:e2e`: Playwright against a mocked API (no backend needed). axe (WCAG 2.2 A/AA) on
  every migrated route in light and dark, in each data state and with overlays open; reflow at
  320/1024/1440px; skip link, menu focus and keyboard system switching.
- **CI doesn't run `lint:css` or `test:e2e` yet**: CI uses the shared `ci-ui.yml` workflow, so both
  need adding there (plus `npx playwright install chromium`).
