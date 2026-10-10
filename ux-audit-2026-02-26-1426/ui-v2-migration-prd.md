# PRD: UI V2 migration and cutover

Last updated: 2026-10-10
Scope: replace the V1 UI in this repo with the V2 design in `new-design.pen`.

## 1. Context

- Design: `new-design.pen` (Pencil) and `style-guides/` (Latte, Mocha). Pencil is not available as of 2026-10-10 (see `BACKLOG-2026-10-10.md`, open decision 3).
- V1 problems behind the redesign: `master-report.md`, `ux-expert-analysis.md`, `atlas.md`.
- Where things are tracked: migration tasks in §7, per-family status in `route-inventory.md`, defects and drift in `BACKLOG-2026-10-10.md`, rules in `migration-governance.md`, history in `execution-log.md`.

## 2. Goals

1. Replace the V1 UI on every core and admin route.
2. Preserve business behavior and API compatibility.
3. Standardize layout, interactions, validation, feedback and state handling.
4. Remove the V1 UI layer and V1-only stores and components at cutover.

## 3. Non-goals

1. Backend API redesign.
2. Data model redesign unless required for UX correctness.
3. Feature expansion unrelated to migration.
4. Rebuilding every domain store from scratch.

## 4. Decisions

### 4.1 Release model (2026-10-10)

One big-bang cutover from the long-lived branch `feat/BCH-1174-ux-resume`.

- Users see no V2 until every route family is V2. Cutover is one PR from this branch to main, opened after the cutover gate (Gate E in `migration-governance.md`) passes.
- This work doesn't change main, and doesn't ask main's contributors to change how they work.
- Exception: bugs that exist on main (backlog M2, M3-01, and the V1 half of `both` items) are fixed with ordinary PRs to main, as long as no V2 behavior leaks into main. The rules are in `migration-governance.md` ("PRs to main").
- Route families are migrated one at a time on the branch. `meta.uiVersion` is a development switch, not a rollout mechanism. Mixed V1/V2 pages on the branch are internal, so don't polish them (e.g. by restyling the V1 shell).

### 4.2 Stores

- One Pinia root. Shared platform and domain stores (auth, config, system context, API-backed stores) stay as they are.
- V2 presentation-only state lives in V2 UI stores (`src/stores/ui-v2.ts`) with versioned persistence keys. V2 view shaping lives in composables.
- V1-only stores and persisted keys are removed at cutover (C-04).

### 4.3 Design system

- Tokens first (Latte + Mocha), then reusable V2 components, then shared page templates for list, detail and modal screens.
- Design rules (Pencil first, approved deviations, families without frames) are in `migration-governance.md`.

#### 4.3.1 Design reference map

Baseline component frame in `new-design.pen`, used for 1:1 parity checks: `Design System / Components / Latte` (`o41qe`). Specimens:

- Buttons: Primary `HbLao`, Outline `lXeK5`, Outline Small `KYLbY`
- Fields: Email `wAhfs`, Password `6i7JZ`
- Dropdown: Trigger `cziSt`, Menu `coHnK`
- Dialogs (confirm overlays): Neutral `3COwp`, Destructive `bYTHD`
- Drawers: List `H1pZG`, Form `bAHLT`
- Toasts: Notice `Dvbui`, Info `zuMCk`, Success `cTCmg`, Error `pOC0f`
- Inline banners: Notice `4Zf6e`, Info `tHwBb`, Success `rjQjc`, Error `NheDG`

In code:

- Route-aware wrappers: `src/volt/`
- V2 primitives and patterns: `src/components/v2/`
- Sandboxes: `/__v2/components` (`src/views/system-v2/V2ComponentLibraryView.vue`) and `/__v2/tokens` (`src/views/system-v2/V2TokenVisualTestView.vue`)

### 4.4 Branch sync architecture (2026-10-10)

Main is merged into the branch daily (procedure: Daily Sync Routine in `migration-governance.md`). Main is active: 145 commits landed between the branch point `28af00f` and the merge at `5b60e22`. That causes two costs:

- **Text conflicts** in files both sides edit. Most come from `src/router/index.ts` (24 main commits since the branch point) and `src/views/LeftSideNav.vue` (15).
- **Silent drift.** Main changes a V1 view that has a V2 copy and git merges cleanly, so V2 quietly lacks the change. This produced the 41 MISSING and 28 PARTIAL rows in `parity-drift.md`.

To keep both low:

- Main-owned files stay byte-identical to main. Branch behavior goes in new files:
  - a router overlay (`src/router/v2.ts`) that replaces the component and `meta.uiVersion` by route name at startup;
  - V2 layouts and navigation that read `src/config/navigation.ts`.
- Accepted exceptions: the route-aware `src/volt/*` wrappers, the V2 tokens in `src/assets/main.css`, and the one-line overlay hook in `main.ts`.
- V1 files stay on the branch until cutover. Deleting them would turn every main edit to them into a modify/delete conflict, and the drift check needs them.
- `AGENTS.md`, `CLAUDE.md`, CI workflows and other main-owned config aren't edited on the branch.

## 5. Release criteria

The cutover gate (Gate E) in `migration-governance.md`.

## 6. Waves

- Wave 0: Planning and foundation.
- Wave 1: Tokens, shell, global scope/gating patterns, auth.
- Wave 2: SSP list/detail and system security plans core editor views.
- Wave 3: System + Controls + Workflows.
- Wave 4: Dashboards + Evidence + Inventory + Risk/POAM.
- Wave 5: Admin and long-tail routes.
- Wave 6: Full cutover, cleanup, hardening.

## 7. Migration task tracker

Legend: `[ ]` not started, `[~]` in progress, `[x]` done, `[-]` blocked.

### 7.1 Program setup and governance

- [x] P0-01 Create migration branch strategy and PR slicing rules (small vertical slices).
- [x] P0-02 Define definition-of-done checklist for each migrated route.
- [x] P0-04 Create route inventory spreadsheet from `src/router/index.ts` with migration status column.
- [x] P0-05 Tag each route by module, complexity, and dependency risk.
- [x] P0-06 Define release gating criteria (functional parity, UX parity, accessibility, visual QA).
- [ ] P0-07 Move V2 route overrides into a branch-only router overlay so `src/router/index.ts` is identical to main (§4.4).
- [ ] P0-08 Restore main's `LeftSideNav.vue`, `SystemView.vue` and `layouts/App.vue`, and move the V2 logic into new files (§4.4).
- [ ] P0-09 Add a V1→V2 twin map and a drift-check script for post-merge drift detection (§4.4).
- [x] P0-10 Document the daily sync routine (merge → `make reviewable` → drift check → port or log) in `migration-governance.md`.

### 7.2 Foundations: tokens, typography, and theming

- [x] P1-01 Add V2 token map from `new-design.pen` variables to CSS variables.
- [x] P1-02 Implement Latte and Mocha themes in app CSS with deterministic token naming.
- [x] P1-03 Add Space Grotesk and JetBrains Mono font loading and fallback stack.
- [x] P1-04 Define typography scale utilities (title, section, label, body, meta).
- [x] P1-05 Implement zero-radius rule and border standards as reusable utilities.
- [x] P1-06 Implement semantic color tokens (success/warn/error/info).
- [x] P1-07 Validate contrast ratios for all token combinations used in key components.
- [x] P1-08 Add visual test page for tokens (colors, type scale, spacing, border usage).
- [x] P1-09 Add theme regression snapshot test baseline.

### 7.3 Foundations: V2 architecture and routing

- [x] P2-01 Add V2 layout scaffold (guest and app variants).
- [x] P2-02 Add route-level UI version switch mechanism (meta or feature flag).
- [x] P2-03 Add V2 navigation shell container preserving existing router behavior.
- [x] P2-04 Ensure PrimeVue services (toast/confirm/tooltip) render with V2 wrappers.
- [x] P2-05 Introduce `ui-v2` store namespace for V2-only presentation state.
- [x] P2-06 Version localStorage/persist keys for V2 UI state.
- [x] P2-07 Add migration guard to avoid mixed V1/V2 component rendering in the same page.
- [x] P2-08 Add instrumentation hook for page-level migration status.

### 7.4 Foundations: shared UX patterns (must be built before mass migration)

- [x] P3-01 Build global "Active SSP" scope indicator component.
- [x] P3-02 Build SSP switcher interaction (change active plan without route loss).
- [x] P3-03 Build standardized prerequisite gate component (title/body/CTA/help).
- [x] P3-04 Implement return-to-origin behavior after prerequisite completion.
- [x] P3-05 Build stateful "Make active / Active" list-row pattern.
- [x] P3-06 Build standardized page header pattern (title, metadata, primary actions).
- [x] P3-07 Build standardized list page template (filters + table + empty state).
- [x] P3-08 Build standardized detail/editor template (tabs + sticky actions).
- [x] P3-09 Build standardized modal form template (labels, required, errors, buttons).
- [x] P3-10 Build loading/empty/error skeleton components for all major content blocks.

### 7.5 V2 component library implementation

#### Base controls

- [x] P4-01 V2 button set (primary, secondary, ghost, danger, small variants).
- [x] P4-02 V2 input controls (text, password, textarea, select, multiselect, date).
- [x] P4-03 V2 checkbox/radio/toggle controls with accessible states.
- [x] P4-04 V2 badge/tag/chip components with semantic variants.
- [x] P4-05 V2 table primitives (header, row, cell actions, pagination).
- [x] P4-06 V2 tabs component consistent across all detail pages.
- [x] P4-07 V2 dialogs/drawers (create/edit/delete confirmation patterns).
- [x] P4-08 V2 inline alert/banner/toast patterns.

#### Interaction and validation

- [x] P4-09 Implement consistent required field marker and helper text rules.
- [x] P4-10 Implement inline field error rendering standard.
- [x] P4-11 Implement form-level error summary with first-error focus.
- [x] P4-12 Standardize destructive action hierarchy (overflow + confirmation).
- [x] P4-13 Standardize status chips and human-readable status text mapping.

#### Quality for component library

- [x] P4-14 Add component story/demo pages for each primitive.
- [x] P4-15 Add unit tests for core interactive states.
- [x] P4-16 Add keyboard and focus-order checks for dialogs/forms/tables.

### 7.6 Wave 1 migration: auth and global shell

- [x] W1-01 Migrate auth layout to V2 (guest shell).
- [x] W1-02 Migrate Login view using V2 form template.
- [x] W1-03 Migrate Forgot Password view using V2 form template.
- [x] W1-04 Migrate Password Reset view using V2 form template.
- [x] W1-05 Migrate SSO callback loading/error states.
- [ ] W1-06 Migrate logout confirmation view/dialog. (Reopened 2026-10-10: no confirm view exists; BACKLOG M3-05.)
- [x] W1-07 Validate auth flows under success, error, and timeout conditions.
- [x] W1-08 Migrate app shell (sidebar + header + content container).
- [x] W1-09 Surface Active SSP indicator globally in app shell.
- [x] W1-10 Validate responsive behavior (desktop + mobile breakpoints).

### 7.7 Wave 2 migration: SSP and system security plan core

- [x] W2-01 Migrate SSP list screen (default/loading/error/empty variants).
- [x] W2-02 Implement stateful active-plan row behavior and feedback toast.
- [x] W2-03 Migrate SSP detail overview screen.
- [~] W2-04 Migrate SSP detail characteristics screen. (No V2 editor for metadata or characteristics; BACKLOG M1-01.)
- [x] W2-05 Migrate SSP detail implementation overview screen.
- [x] W2-06 Migrate SSP detail implementation users screen (V2 inner tab in `SystemSecurityPlanSystemImplementationView.vue`).
- [x] W2-07 Migrate SSP detail implementation components screen (V2 inner tab).
- [x] W2-08 Migrate SSP detail implementation authorizations screen (V2 inner tab).
- [x] W2-09 Migrate SSP detail controls screen and requirement drill-down states.
- [x] W2-10 Migrate SSP detail compliance screen.
- [x] W2-11 Migrate SSP detail JSON screen.
- [~] W2-12 Migrate all SSP loading/error/no-data/no-profile states. Done for the V2 tabs (W2-01..W2-11); the V1 children added by main (W2-13, W2-14) still use V1 state handling.
- [ ] W2-13 Retire the duplicate V1 SSP children added by main (`users`, `components`, `authorizations` import `views/system-security-plans/*` under v2 meta): redirect them to the V2 implementation inner tabs or point the V2 tab bar's `COMPONENTS` tab at the V2 view.
- [ ] W2-14 Migrate the SSP detail tabs added by main, now rendering V1 views inside the V2 shell: `export-offerings`, `leverage`, `inherited-capabilities`, `risks`, `risks/:riskId` (shares `RisksView.vue`/`risk/RiskDetailView.vue` with W4-11). No Pencil frames; follow §7.10a.

### 7.8 Wave 3 migration: System, Controls, Workflows

#### System module

- [x] W3-01 Migrate System overview tab. (The parent `views/SystemView.vue` is still a V1 shell; see W3-18.)
- [ ] W3-02 Migrate System users tab and create/edit dialogs. (Since the main merge it renders the V1 view inside the V2 shell.)
- [ ] W3-03 Migrate System components tab and create/edit dialogs.
- [ ] W3-04 Migrate leveraged authorizations tab and create/edit dialogs.
- [ ] W3-05 Replace raw-ID inputs with assisted selection where applicable.
- [ ] W3-18 Migrate the `/system` tabs added by main (characteristics, implementation, control-implementation, export-offerings, leverage, inherited-capabilities, risks, compliance, json) and replace the V1 `SystemView.vue` parent shell. All are tagged v2 but import V1 views (`V1_in_V2_shell`). Reuse the SSP V2 views where the content is the same.

#### Controls module

- [x] W3-06 Migrate Controls list/tree layout and search panel (`controls-v2/ControlsWorkspaceView.vue`, `846f9d3`).
- [~] W3-07 Migrate control details drawer and ensure deterministic open behavior. V2 requirement/statement drawers (`V2WorkspaceDrawer`) shipped in `846f9d3`; the main merge embedded V1 partials `IndexControlImplementation` and `SharedResponsibilityPanel` in the Open Requirement drawer.
- [x] W3-08 Migrate controls empty-search and no-details states with clear copy.
- [x] W3-09 Migrate secondary gate (no linked profile) with direct corrective CTA (`PrerequisiteGate` with `Open active SSP`).
- [ ] W3-10 Validate keyboard navigation for tree, rows, and drawer interactions. (No spec for `ControlsWorkspaceView` yet.)

#### Workflow definitions and instances

Pencil frames added 2026-03-14 (`dbaa8a1`): `xoqKd` (Workflow Definitions / V2 Designs) and `ZYWqx` (Workflow Instances / V2 Designs).

- [ ] W3-11 Migrate Workflow Definitions list/create.
- [ ] W3-12 Migrate Workflow Definition detail tabs (Overview, Steps, Controls, JSON).
- [ ] W3-13 Migrate Workflow Instances list/create/filters.
- [ ] W3-14 Migrate Workflow Instance detail tabs (Overview, Roles, Executions, JSON).
- [ ] W3-15 Migrate execution dialogs and detail panels.
- [ ] W3-16 Normalize status labels and badges across workflow screens.
- [ ] W3-17 Validate all workflow form validation/error states.

### 7.9 Wave 4 migration: Dashboards, Evidence, Inventory, Risk/POAM

#### Dashboards

- [~] W4-01 Migrate dashboards list with safe action hierarchy. (No Edit or Create, and delete isn't permission-gated: BACKLOG M0-07. Main's later changes to V1 `dashboard/IndexView.vue` are no longer routed; port or drop them under W4-02/W4-03.)
- [ ] W4-02 Migrate dashboard create/edit forms with full validation behavior.
- [ ] W4-03 Migrate dashboard detail screens if applicable.

#### Evidence

- [ ] W4-04 Migrate evidence list/search screen with improved density rules.
- [ ] W4-05 Migrate evidence create/update forms with standardized validation.
- [ ] W4-06 Migrate evidence detail and history views.
- [ ] W4-07 Clarify evidence versioning labels and timeline presentation.

#### Inventory

- [ ] W4-08 Migrate inventory list and filter panel.
- [ ] W4-09 Ensure source filter behavior is functional or relabeled clearly.
- [ ] W4-10 Migrate inventory detail affordance and interaction clarity.

#### Risk register and POA&M

- [ ] W4-11 Migrate risk register list/detail flows.
- [ ] W4-12 Migrate POA&M list/detail and tabbed editor flows.
- [ ] W4-13 Migrate POA&M create/edit forms with standardized validation.

### 7.10 Wave 5 migration: admin and long-tail modules

- [ ] W5-01 Migrate admin import screens and disabled-state guidance.
- [ ] W5-02 Migrate catalogs list/detail/create/edit.
- [ ] W5-03 Migrate profiles list/detail/create/edit/merge.
- [ ] W5-04 Migrate component definitions list/detail/create/edit.
- [ ] W5-05 Migrate assessment plans list/detail/create/edit.
- [ ] W5-06 Migrate assessment results list/detail/create/edit.
- [ ] W5-07 Migrate users/roles/parties admin screens.
- [ ] W5-08 Migrate remaining miscellaneous routes (preferences/about/etc.).

### 7.10a Post-merge route families (no Pencil design)

Route families added by main, merged at `5b60e22`. None has a Pencil frame, so they follow "Families without Pencil frames" in `migration-governance.md`. Sizes and status are in `route-inventory.md`.

- [ ] PM-01 Slack link callback `/auth/slack/callback` (Wave 1): tagged v2 but imports V1 `SlackLinkCallbackView.vue`; rebuild with auth-v2 primitives (`AuthPanelCard`) and SSO callback states.
- [ ] PM-02 Dashboard suggestions `/dashboards/suggestions/:sspId` (Wave 4): `dashboard/SuggestionsView.vue` and its suggestion scope/edit dialogs.
- [ ] PM-03 CCF POA&M items `/poam-items` (Wave 4): list view; move from the legacy `composables/api` client to `composables/axios`.
- [ ] PM-04 Lineage `/lineage`, `/lineage/graph` (Wave 4): tree and graph views, scope bar and node drawer.
- [ ] PM-05 Control links `/control-links`, `/control-links/new` (Wave 5): list and create.
- [ ] PM-06 Admin agents `/admin/agents` (Wave 5): agents list, keys, and the agent-config Configuration tab (plugin tabs, add-plugin dialog, history/revert).
- [ ] PM-07 Admin diagnostics `/admin/diagnostics/*` (Wave 5): notifications and AI suggestions tabs, plus the `/admin/notifications` redirect.
- [ ] PM-08 Admin risks `/admin/risks` (Wave 5).
- [ ] PM-09 Admin risk templates `/admin/risk-templates` (Wave 5).
- [ ] PM-10 Admin subject templates `/admin/subject-templates`, `/admin/subject-templates/:id` (Wave 5).
- [ ] PM-11 Admin groups `/admin/groups`, `/admin/groups/:id` (Wave 5).

The SSP and `/system` tabs that main added to existing families (W2-13, W2-14, W3-18) follow the same rules.

### 7.11 Quality engineering and verification (all waves)

- [ ] Q-01 Add route-level visual regression coverage for migrated pages.
- [ ] Q-02 Add smoke E2E tests for auth, SSP selection, and major module entry paths.
- [ ] Q-03 Add E2E tests for critical create/edit/delete flows per module.
- [ ] Q-04 Add accessibility checks (focus trap, labels, aria, keyboard paths).
- [ ] Q-05 Add performance baseline for shell, large tables, and key editors.
- [ ] Q-06 Verify dark/light theme parity for all migrated pages.
- [ ] Q-07 Verify loading/empty/error states exist for every data-fetching page.

### 7.12 Cutover and cleanup

- [ ] C-01 Fold the router overlay into `src/router/index.ts`, with every route pointing at its V2 view.
- [ ] C-02 Remove V1 UI components no longer referenced.
- [ ] C-03 Remove V1-only styles and obsolete token aliases.
- [ ] C-04 Remove V1 UI-only stores and persisted keys, with a one-time localStorage cleanup.
- [ ] C-05 Consolidate duplicated composables introduced during migration.
- [ ] C-06 Run full regression and fix final parity gaps.
- [ ] C-07 Update documentation and onboarding for V2 architecture.
- [ ] C-08 Merge the cutover PR to main (the release follows the normal release-please flow) and archive this tracker.

## 8. Risks and mitigations

- **Silent drift from main** (it built up 41 MISSING and 28 PARTIAL rows in seven months). Mitigation: daily merges, the drift check, and an empty drift section (BACKLOG D) required by Gate E.
- **Merge conflicts make the daily sync expensive, so it gets skipped.** Mitigation: the overlay architecture in §4.4 (P0-07, P0-08).
- **A big-bang release puts every regression on one day.** Mitigation: the E2E suites (Q-02, Q-03) running against the branch, and a full cutover rehearsal on a `preview`-labelled PR image.
- **Mixed V1/V2 components on one page cause drift in look and behavior.** Mitigation: the migration guard (development-time only).
- **Persisted state collides between V1 and V2 UI stores.** Mitigation: versioned keys.
- **Regressions in SSP selection, switching and gating.** Mitigation: a dedicated E2E suite (Q-02).
- **Accessibility regressions in new dialogs and tables.** Mitigation: the Definition of Done checks.

## 9. Dependencies

- Pencil access for visual QA of families that have frames (BACKLOG open decision 3).
- Representative local data: `seed-data.md`.
- Daily time for the main sync and drift porting.
- Product and UX signoff on the global Active SSP behavior.
