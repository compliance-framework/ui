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

| Path                               | What it is                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ds/tokens/`                   | Design tokens, all prefixed `--ds-` so they never clash with Tailwind, and the global element defaults.                                                           |
| `src/ds/components/`               | Shared components from the mockup (Button, DataTable, DataState, FilterBar, Menu, Dialog, Tabs, LineChart, CodeBlock, layout primitives…), on reka-ui and Lucide. |
| `src/ds/templates/`                | `AppShell` (the app's only frame: header, nav, system switcher, account menu) and `ListTemplate`.                                                                 |
| `src/ds/query.ts`                  | `useApiQuery`: `useDataApi` mapped to the DataState states (loading, ready, empty, error, forbidden).                                                             |
| `src/screens/`                     | Migrated pages. Screens compose templates and components and contain no CSS or class attributes.                                                                  |
| `src/views/layouts/LegacyPage.vue` | The frame for pages not yet migrated: restores their Tailwind look (Inter, text colours) inside the new shell. Deleted with the last classic page.                |

Routes in `src/router/index.ts`: migrated pages are in `designSystemRoutes` with `meta.ds`, which
tells the shell not to wrap them in `LegacyPage`. Classic pages keep the classic layout's
behaviour: `meta.activeSystemScoped` pages remount when the current system changes.

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

| Area                                                                                             | Classic routes                                                                                               | Status                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell (layout, nav, system switcher, account menu, theme)                                    | the classic `App` layout, `LeftSideNav`                                                                      | **Done**                                                                                                                                                                                       |
| Systems list                                                                                     | `system-security-plans` → `/systems`                                                                         | **Done**, with New system (shared document form)                                                                                                                                               |
| This System > Evidence                                                                           | `system:evidence` → `/systems/:id/evidence`                                                                  | **Done**                                                                                                                                                                                       |
| Evidence record                                                                                  | `evidence:view` → `/evidence/:id`, `/systems/:id/evidence/:id`                                               | **Done, with one gap:** policy playback isn't rebuilt (the page says so)                                                                                                                       |
| Global > Evidence                                                                                | `evidence:index` → `/evidence` (same screen as This System > Evidence)                                       | **Done**                                                                                                                                                                                       |
| Evidence create, re-submit, history                                                              | `evidence:create`, `evidence:update` (one form screen), `evidence:history` → the latest record's History tab | **Done**                                                                                                                                                                                       |
| This System > Implementation                                                                     | `controls:index` → `/systems/:id/implementation`                                                             | **Done (with islands)**: frame, profiles, control tree, drawer on the design system; the per-control editor, component statements, suggestions and shared responsibilities are classic islands |
| This System > Compliance                                                                         | `compliance:index` → `/systems/:id/compliance`                                                               | **Done**                                                                                                                                                                                       |
| This System > Risks: dashboard, register, new and edit risk                                      | `risks:index` → `/systems/:id/risks` (dashboard) and `/systems/:id/risks/register`                           | **Done**, plus the cross-system register (`/admin/risks`) and the risk page (`risks:detail`: design-system header, classic body)                                                               |
| This System > Workflow Instances (list, New instance)                                            | `workflow-instances:index` → `/systems/:id/workflows`                                                        | **Done**; instance page and run page on the design system (their tabs, steps and panels are islands)                                                                                           |
| Configure System (15 tabs)                                                                       | `system:*`, `system-component-dashboards` → `/systems/:id/configure/...`                                     | **Done (with islands)**: frame and tabs on the design system; each section's content is the classic SSP view as an island                                                                      |
| POA&M items, inventory                                                                           | `poam-items:index`, `inventory:index`                                                                        | POA&M items **done**; inventory **done** (design-system header, classic body)                                                                                                                  |
| SSP editor (16 tabs)                                                                             | `system-security-plan-*` → Configure System (sections), Risks, Compliance                                    | **Merged into Configure System**; SSP create (`system-security-plans-create`) still classic                                                                                                    |
| Evidence filters (dashboards)                                                                    | `dashboards`, `dashboards.*`                                                                                 | List **done** (trend in a drawer); New filter and Suggestions frames done (form and suggestions are islands)                                                                                   |
| Analysis: cross-system risks, compliance map                                                     | `admin-risks`, `lineage`, `lineage-graph`                                                                    | Cross-system risks **done**; Compliance Map frame and tabs **done** (tree, graph, scope bar and drawer are islands)                                                                            |
| Integrations: workflow definitions, agents, import                                               | `workflow:index`, `workflow-definition-*`, `admin-agents`, `admin-import`                                    | Workflow definitions list **done**; definition record done with islands; agents and import **done** (design-system header, classic body)                                                       |
| Control Definitions: catalogs, profiles, control links, component definitions                    | `catalog-*`, `profile*`, `control-links-*`, `component-definition*`                                          | Lists of catalogs, profiles, component definitions; catalog page; control evidence; control links; create catalog, profile, component definition; build-props **done**          |
| Assessment plans, assessment results                                                             | `assessment-plan*`, `assessment-results*`                                                                    | Lists, create and edit **done** (shared form); records done with islands                                                                                                                       |
| POA&M documents                                                                                  | `plan-of-action-and-milestones*`                                                                             | List, create and edit **done** (shared form); record done with islands                                                                                                                         |
| Admin: users, groups, parties, roles, templates (SSP, subject, risk), diagnostics, notifications | `users-list`, `user-view`, `admin-*`                                                                         | Users, groups, parties, roles; user and group pages; system templates; Diagnostics; subject template page; subject and risk template lists (design-system header, classic body) **done**                                   |
| My tasks, preferences, about                                                                     | `my-tasks`, `preferences`, `about`                                                                           | **Done** (My tasks step panel and the Slack link section are islands)                                                                                                                          |
| Sign-in, password reset, SSO and Slack callbacks (guest layout)                                  | `login`, `forgot-password`, `password-reset`, `sso-callback`, `slack-link-callback`                          | **Done**: new `GuestTemplate`; scripts kept from the classic pages                                                                                                                             |

When the last classic page goes: delete `LegacyPage`, PrimeVue, Volt, Tailwind and the classic
components; drop the `--ds-` prefix if wanted.

## Legacy islands

Some migrated pages embed classic components (inside `LegacyPage`) for deep editors that are
large enough to rebuild separately. They work and keep their tests; they still look classic.
Replace each with a design-system version, then delete the classic component.

- Configure System: the hidden sections reachable by link (Control Implementation); the
  subscribe wizard inside Leverage; the export offering forms and items and allowlist editors; the user and leveraged
  authorization forms; inside rebuilt sections, the draw.io editor, the component risks list and the
  evidence-filter drawer, and the new/edit component forms.
- Implementation: `IndexControlImplementation`, `ControlEvidenceCounter`, `SharedResponsibilityPanel`,
  `ExportStatementDialog`, and the shared-responsibility blocks inside each component statement.
- Risk page body (`RiskDetailView`, embedded): overview, lifecycle actions, tabs, remediation.
- Record tabs still classic: inside the rebuilt POA&M tabs, the item details and milestones, the attach dialog and every form; the
  POA&M risk page (classic risk detail); profile control-group editor and
  catalog import dialog; workflow step form and step graph; execution metrics, step graph, list
  and panel on the run page; My tasks step panel.
- Component definitions: the new/edit component, capability and resource forms (in
  design-system dialogs).
- Admin bodies under design-system headers (`embedded`): Agents, risk and subject templates,
  Filter suggestions; the workflow import panel on Import; system template form/preview/instances, Diagnostics sections, Compliance
  Map tree/graph, catalog control tree and dialogs, evidence filter form, Slack link section.

Rebuilt so far (no longer islands): every JSON tab, the four OSCAL Overview tabs, profile
Controls, Compliance and Merge, workflow definition Overview, Steps (table) and Controls, workflow
instance Overview and Runs, assessment plan Tasks list, every visible Configure System tab
(Overview, Characteristics, Authorization Boundary, Components, Scope, JSON), component
definition Components, Capabilities and Back matter, every POA&M tab, assessment results
Results, workflow instance Roles, Configure System Users, Leveraged Authorizations, System
Implementation, Leverage, Inherited Capabilities and Export Offerings; the Implementation drawer's
AI suggestions and component statements; assessment plan Tasks (with activities and steps); the user and group pages' members and roles; Build a profile from props; Scope's label-condition fields; the subject template page; Inventory; Import (OSCAL and evidence filters); toasts,
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
  `CodeBlock` uses the PrimeVue toast; the mockup's prototype-only pieces were left out.
- **API access stays on the existing axios client** (`useDataApi`, `useAuthenticatedInstance`), so
  camelCasing, cookie auth and the 401/403 handling are unchanged. No new data library yet.
- **Dark mode uses the existing `.dark` class and `useTheme`**; the shell's account menu changes
  it. The classic floating theme button is gone.
- **Toasts use the design system's `ToastRegion`** (ported from the mockup), mounted once in
  `App.vue`. It listens to PrimeVue's toast event bus, so every existing `useToast()` call, classic
  or redesigned, shows a design-system toast. Success and info dismiss after 5 s; warnings and
  errors stay until dismissed (the `life` a call site passes is ignored).
- **Confirmations use the design system's `ConfirmHost`** in `App.vue`, which shows PrimeVue
  `useConfirm().require(...)` requests as design-system ConfirmDialogs. New screens use
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
- **The evidence form** uses native date inputs (local calendar dates, sent as local midnight as
  before), validates on submit with errors beside fields and a summary, keeps entries when a
  save fails, and keeps Re-submit's stream UUID and labels. Subjects are added and removed as a
  list.
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
