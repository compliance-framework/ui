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

| Area                                                                                             | Classic routes                                                                                               | Status                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell (layout, nav, system switcher, account menu, theme)                                    | the classic `App` layout, `LeftSideNav`                                                                      | **Done**                                                                                                                                                         |
| Systems list                                                                                     | `system-security-plans` → `/systems`                                                                         | **Done**                                                                                                                                                         |
| This System > Evidence                                                                           | `system:evidence` → `/systems/:id/evidence`                                                                  | **Done**                                                                                                                                                         |
| Evidence record                                                                                  | `evidence:view` → `/evidence/:id`, `/systems/:id/evidence/:id`                                               | **Done, with two gaps:** policy playback and Create risk aren't rebuilt (the page says so)                                                                       |
| Global > Evidence                                                                                | `evidence:index` → `/evidence` (same screen as This System > Evidence)                                       | **Done**                                                                                                                                                         |
| Evidence create, re-submit, history                                                              | `evidence:create`, `evidence:update` (one form screen), `evidence:history` → the latest record's History tab | **Done**                                                                                                                                                         |
| This System > Implementation                                                                     | `controls:index`                                                                                             | To do                                                                                                                                                            |
| This System > Compliance                                                                         | `compliance:index` → `/systems/:id/compliance`                                                               | **Done**                                                                                                                                                         |
| This System > Risks: dashboard, register, new and edit risk                                      | `risks:index` → `/systems/:id/risks` (dashboard) and `/systems/:id/risks/register`                           | **Done**; risk detail (`risks:detail`) still classic. The classic Risks view stays for the SSP editor's Risks tab, and its register panel for cross-system Risks |
| This System > Workflow Instances (list, New instance)                                            | `workflow-instances:index` → `/systems/:id/workflows`                                                        | **Done**; instance editor (`workflow-instance-*`) and run view (`workflow-execution-view`) still classic                                                         |
| Configure System (15 tabs)                                                                       | `system:*`, `system-component-dashboards`                                                                    | To do                                                                                                                                                            |
| POA&M items, inventory                                                                           | `poam-items:index`, `inventory:index`                                                                        | To do                                                                                                                                                            |
| SSP editor (16 tabs), create                                                                     | `system-security-plan-*`, `system-security-plans-create`                                                     | To do                                                                                                                                                            |
| Evidence filters (dashboards)                                                                    | `dashboards`, `dashboards.*`                                                                                 | To do                                                                                                                                                            |
| Analysis: cross-system risks, compliance map                                                     | `admin-risks`, `lineage`, `lineage-graph`                                                                    | To do                                                                                                                                                            |
| Integrations: workflow definitions, agents, import                                               | `workflow:index`, `workflow-definition-*`, `admin-agents`, `admin-import`                                    | To do                                                                                                                                                            |
| Control Definitions: catalogs, profiles, control links, component definitions                    | `catalog-*`, `profile*`, `control-links-*`, `component-definition*`                                          | To do                                                                                                                                                            |
| Assessment plans, assessment results                                                             | `assessment-plan*`, `assessment-results*`                                                                    | To do                                                                                                                                                            |
| POA&M documents                                                                                  | `plan-of-action-and-milestones*`                                                                             | To do                                                                                                                                                            |
| Admin: users, groups, parties, roles, templates (SSP, subject, risk), diagnostics, notifications | `users-list`, `user-view`, `admin-*`                                                                         | To do                                                                                                                                                            |
| My tasks, preferences, about                                                                     | `my-tasks`, `preferences`, `about`                                                                           | To do                                                                                                                                                            |
| Sign-in, password reset, SSO and Slack callbacks (guest layout)                                  | `login`, `forgot-password`, `password-reset`, `sso-callback`, `slack-link-callback`                          | To do                                                                                                                                                            |

When the last classic page goes: delete `LegacyPage`, PrimeVue, Volt, Tailwind and the classic
components; drop the `--ds-` prefix if wanted.

## To-dos

Small things noticed along the way, to sweep up later:

- Compliance: the six totals wrap to two rows at 1440px; a compact tile row would fit them on one.
- The classic Compliance page read `uuid` from `GET /ssp/:id/profiles`, but the API returns `id`,
  so on `main` it may never find the attached profiles. The new page accepts both. Worth checking
  on `main`.
- The classic "Select a system" prompt (classic system pages) still uses classic styling.
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
- **Toasts still use PrimeVue's Toast** until the mockup's toast region is ported, so there is one
  toast system.
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
