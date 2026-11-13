# Redesign proof of concept

Branch `poc/redesign-foundation` brings the design system from `ccf-mockup-redesign` into this
repo and rebuilds two screens with it against the live API: the Systems list and This System >
Evidence. The goal is to show the migration path:
the new design system sits beside the legacy UI and screens move over one at a time.

## Try it

```sh
npm run dev   # then sign in and use "Try the new UI" in the header
# against local-dev while its containers hold port 3000:
VITE_API_PROXY=http://localhost:8080 npm run dev
```

- `/next/systems` is the redesigned Systems list (also "All systems" in the system switcher).
- `/next/systems/<ssp-uuid>/evidence` is This System > Evidence. The link is shareable: opening it
  makes that system the current system.
- The new shell's nav keeps the classic app's structure and labels. Items marked with ↗ still open
  the classic page (and the classic layout). "Classic UI" in the header goes back; on the classic
  system Evidence page, "Try the new UI" opens the redesigned one with the same view.
- The theme follows the existing setting (`dark` class, `theme` in localStorage), so switching in
  either UI carries over.

## What is where

| Path                 | What it is                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ds/tokens/`     | Design tokens (colour, type, space, motion…) and element defaults, copied from the mockup and scoped to `html[data-ds]`.                                        |
| `src/ds/components/` | 30 component folders from the mockup (Button, DataTable, DataState, FilterBar, Menu, Dialog, Drawer, Select, Tabs, layout primitives…), on reka-ui and Lucide.  |
| `src/ds/templates/`  | `AppShell` (new header, nav, system switcher) and `ListTemplate`.                                                                                               |
| `src/ds/query.ts`    | `useApiQuery`: wraps `useDataApi` and maps the request to the DataState states (loading, ready, empty, error, forbidden).                                       |
| `src/screens/`       | Redesigned screens. Screens compose templates and components; they contain no CSS or class attributes. `systems/SystemScope.vue` is the frame for system pages. |

## Decisions for review

Answered so far (2026-11-13): 2 is accepted for now; 7 is the system in the URL, with navigation
true to the current app; 8 is to match the current app's columns, with no summary endpoint. 13–16
are new and still open.

1. **Incremental migration, not a rewrite.** The design system lives in `src/ds/` next to PrimeVue
   and Tailwind. Each screen moves when it's ready, and PrimeVue and Tailwind are removed once
   nothing uses them.
2. **The new shell is mounted at `/next/*`.** Legacy routes and the legacy layout are untouched.
   Each new screen gets a `/next/...` route. When a section is fully migrated, its legacy route can
   redirect to it, and eventually `/next` becomes `/`. The alternative, rendering legacy pages
   inside the new shell, was rejected for now: the two visual languages side by side looked worse
   than switching layouts.
3. **The tokens are inert until the new shell mounts.** The shell sets `data-ds` on `<html>`, and
   every token and element default is scoped to `:root[data-ds]` (element defaults sit under
   `:where()` to keep their specificity low). This matters because several mockup tokens share
   names with Tailwind v4 theme variables (`--font-weight-bold`, `--leading-tight`,
   `--tracking-wide`…), and the mockup's global `html`/`a` styles would otherwise restyle legacy
   pages. It is on `<html>` rather than the shell element so reka-ui's portalled menus and popovers
   (rendered into `<body>`) get the tokens too.
4. **Dark mode reuses the legacy `.dark` class.** The mockup's `[data-theme='dark']` selectors
   became `:root[data-ds].dark`. The account menu drives the existing `useTheme`, so there is one
   theme setting for both UIs.
5. **Components were copied, not shared as a package.** `src/ds` is a snapshot of the mockup's
   components with imports rewritten. The mockup stays a design reference; from here on, the copy
   in this repo is the source of truth. Copied changes:
   - `DataState` reads the signed-in user from the auth store. Its forbidden copy no longer names a
     role, because the API has no single role label.
   - `format.ts` uses the real clock, not the mockup's fixed date.
   - `Menu/menu.ts` was renamed to `menuEntries.ts`: vue-tsc 2 treats `Menu.vue` and `menu.ts` as a
     case clash.
   - The mockup's prototype-only pieces (prototype bar, font comparison, fixtures) were left out.
6. **API access stays on the existing axios client.** `useApiQuery` sits on `useDataApi`, so
   camelCasing, cookie auth and the 401/403 interceptors behave as they do everywhere else. No new
   data library (such as TanStack Query) for now. Revisit when screens need caching or shared
   queries.
7. **The system lives in the URL; navigation stays true to the current app.** _Agreed._
   - Redesigned system pages are `/next/systems/:systemId/...`, identified by SSP UUID.
     `SystemScope` frames them: it loads the system named in the URL and makes it the current
     system, so a shared link sets the reader's current system, and the nav, the switcher and the
     classic system pages (which read the system store) all agree. An unknown system shows "System
     not found" in place. So does a 403 (_agreed 2026-11-13_): the API documents no
     per-system 403 yet, and treating both alike never confirms that a hidden system exists.
   - Switching system on a redesigned system page keeps the same page and puts the new system in
     the URL. Search, sort and page are dropped on a switch, because they may not apply.
   - The nav has the classic structure and labels: **This System** (Evidence, Implementation,
     Compliance, Risks, Workflow Instances, Configure System), then **Global** (Evidence) with
     **Analysis**, **Integrations**, **Control Definitions** and **Admin** as collapsible groups.
     As in the classic app, the Systems list is reached from the system switcher, not the nav.
8. **Systems was the first screen; its columns match the current app.** _Agreed._ Title, version
   and last modified, with no summary endpoint. It exercises the shell, the list template, the
   filter bar, the data table, every DataState state, URL-held search and sort, row menus and
   permission-gated actions. Creating a system and opening one still go to the classic pages.
9. **The mockup's terminology is adopted only on new screens.** The Systems page says "Systems"
   and "Current", not "System Security Plans" and "Active". The status vocabulary in
   `StatusBadge/statuses.ts` came across intact but isn't used yet; each wording change should be
   accepted as screens migrate.
10. **ESLint's `vue/multi-word-component-names` is off for `src/ds/**` only.** The components are
    namespaced by folder (`@/ds/components/Text/Text.vue`). The repo's Prettier settings (80
    columns) were applied to the copied files, so the mockup's 120-column formatting isn't kept.
11. **Toasts still use PrimeVue's global Toast.** The mockup's `ToastRegion` and toast state
    weren't ported, to keep one toast system during the migration. The floating theme toggle and
    demo feedback button from the legacy `App.vue` also still show on new pages.
12. **Browser, accessibility and style checks are ported** (_done 2026-11-13_).
    - `npm run test:e2e` (Playwright, `e2e/`) runs axe (WCAG 2.2 A/AA plus best practice) on
      every `/next` route in light and dark and in the ready, empty, error and loading states, and
      with each menu, popover and drawer open. It also checks reflow at 320, 1024 and 1440 px, the
      skip link, Escape and focus return on menus, the keyboard system switcher, and that every
      action is reachable at 1280×800.
    - The API is mocked in the browser (`e2e/support/api.ts`) with fixtures in the API's wire
      format, so no backend is needed. It runs on the installed Chrome locally and on Playwright's
      Chromium in CI.
    - `npm run lint:css` (stylelint) holds `src/ds` and `src/screens` to the design tokens: no
      raw colours, lengths, durations or type values. It is part of `make reviewable`.
    - **CI doesn't run either yet.** CI calls the shared `ci-ui.yml` workflow, which runs the
      checks individually rather than `make reviewable`, so both need adding there, plus
      `npx playwright install chromium` for the browser checks.
    - Porting surfaced and fixed real issues: `<html lang="">` app-wide (now `en`); the classic
      floating theme and feedback buttons came before the skip link in tab order (they now follow
      the page, and the theme button is hidden in the new shell, which has its own); and the
      account menu button's accessible name didn't include its visible text.
    - Not ported from the mockup: the vocabulary check (terminology now follows the current app)
      and knip.
13. **This System > Evidence is a first cut of the classic page, with a handoff for the rest.** It
    has the scope check ("Define this system's scope"), title and label-query search with the same
    validation as the classic page, sort by status, name and last seen, pagination, the subjects
    column, and Share. **Not yet ported:** the compliance-over-time and agent-health charts, CSV
    export, Save as filter, the subject filter and the labels column. "Open classic view" opens the
    classic page with the exact same view for those.
14. **Evidence uses the classic page's query parameters** (`filter`, `page`, `sortBy`,
    `sortDirection`, `subject`), so a view moves between the two pages unchanged, and a subject
    filter set on the classic page is honoured (and shown as a removable chip) here.
15. **Evidence records still open on the classic record page**, with `from=system` so its "back"
    returns to This System > Evidence. The record page is the obvious next migration after this
    one.
16. **Times show in the viewer's local time zone.** The mockup used UTC everywhere so its
    screenshots were stable; for real data, local time matches the classic page.

## Suggested next steps

- Review 13–16.
- Add `lint:css` and `test:e2e` to the shared CI workflow.
- Finish Evidence (charts, CSV export, save as filter, subject filter), then the evidence record
  page, so the whole evidence journey stays in the new UI.
- Then a system page with editing (Risks or Configure System) to prove out forms and dialogs.
