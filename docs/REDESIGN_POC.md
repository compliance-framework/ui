# Redesign proof of concept

Branch `poc/redesign-foundation` brings the design system from `ccf-mockup-redesign` into this
repo and rebuilds one screen with it against the live API. The goal is to show the migration path:
the new design system sits beside the legacy UI and screens move over one at a time.

## Try it

```sh
npm run dev   # then sign in and open /next/systems, or use "Try the new UI" in the header
```

- `/next/systems` is the redesigned Systems list, on live data, inside the new shell.
- The new shell's nav uses the redesign's structure and labels. Items marked with ↗ still open the
  classic page (and the classic layout). "Classic UI" in the header goes back.
- The theme follows the existing setting (`dark` class, `theme` in localStorage), so switching in
  either UI carries over.

## What is where

| Path                 | What it is                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ds/tokens/`     | Design tokens (colour, type, space, motion…) and element defaults, copied from the mockup and scoped to `html[data-ds]`.                                       |
| `src/ds/components/` | 30 component folders from the mockup (Button, DataTable, DataState, FilterBar, Menu, Dialog, Drawer, Select, Tabs, layout primitives…), on reka-ui and Lucide. |
| `src/ds/templates/`  | `AppShell` (new header, nav, system switcher) and `ListTemplate`.                                                                                              |
| `src/ds/query.ts`    | `useApiQuery`: wraps `useDataApi` and maps the request to the DataState states (loading, ready, empty, error, forbidden).                                      |
| `src/screens/`       | Redesigned screens. Screens compose templates and components; they contain no CSS or class attributes.                                                         |

## Decisions for review

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
7. **The navigation follows the redesign's structure, mapped onto today's routes.** It has the
   current system, Global, Control definitions and Admin. Labels follow the mockup where a
   matching page exists ("All systems", "Evidence stream", "Cross-system risks", "Source"). Where
   the mockup's destination doesn't exist yet (Assessments, People, Details, Components, POA&M),
   the item is left out rather than pointed at a near match. "Implementation" and "Evidence
   filters" keep legacy names because the redesign merges them into other pages. The system group
   still reads the active system from the system store; the mockup puts the system in the URL
   (`/systems/:sspId/...`). Moving to URL scoping is a separate decision, and probably the most
   important structural one.
8. **Systems was the first screen.** It is a read-mostly list, so it exercises the shell, the list
   template, the filter bar, the data table, every DataState state, URL-held search and sort, row
   menus and permission-gated actions, all on one endpoint. The mockup's columns for
   authorization, impact, controls implemented, evidence satisfied and open risks were **left
   out**: the list endpoint doesn't return them, and loading each system's records just to fill
   the table would be slow. They need a summary endpoint from the API. Creating a system and
   opening one still go to the classic pages.
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
12. **The mockup's tooling isn't ported yet:** Playwright browser tests, axe accessibility checks,
    stylelint token enforcement, the vocabulary check and knip. They're the biggest remaining win
    from the mockup and should come next, before more screens are migrated. This branch has Vitest
    specs for the Systems screen, its URL state and `useApiQuery`.

## Suggested next steps

- Agree on the decisions above, especially 2 (`/next` route prefix), 7 (system scoped in the URL
  or in the store) and 8 (an API summary endpoint for the Systems list).
- Port the Playwright, axe and stylelint setup and run it on `/next/*`.
- Migrate a system-scoped screen next (Overview or Evidence) to test URL scoping.
