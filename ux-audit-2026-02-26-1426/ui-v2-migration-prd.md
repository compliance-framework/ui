# PRD: UI V2 Migration and Full Cutover

Status: Draft v1.0  
Last updated: 2026-03-04  
Primary scope: `@ui/` frontend redesign and full migration to the new Pencil design (`new-design.pen`)

## 1. Context

The new UI has already been designed in `ui/ux-audit-2026-02-26-1426/new-design.pen` with Latte/Mocha style guides. You can use pencil tools to access the design.

- `ui/ux-audit-2026-02-26-1426/style-guides`

Current production UI in `@ui/` is visually and interactionally inconsistent across modules and has known UX issues documented in:

- `ui/ux-audit-2026-02-26-1426/master-report.md`
- `ui/ux-audit-2026-02-26-1426/ux-expert-analysis.md`
- `ui/ux-audit-2026-02-26-1426/atlas.md`

We need a controlled, trackable migration plan that allows incremental delivery and a final full replacement of V1 UI.

## 2. Goals

1. Ship the new UI across all core and admin routes in `@ui/`.
2. Preserve business behavior and API compatibility during migration.
3. Standardize layout, interactions, validation, feedback, and state handling.
4. Eliminate V1 UI layer and obsolete UI-only stores/components after cutover.
5. Keep migration progress auditable with a single detailed task tracker.

## 3. Non-goals

1. Backend API redesign.
2. Data model redesign unless required for UX correctness.
3. Feature expansion unrelated to migration.
4. Rebuilding every domain store from scratch before route cutover.

## 4. Product and Technical Decisions

## 4.1 Migration model

- Build V2 UI layer alongside V1.
- Migrate route families incrementally.
- Cut over by route/layout flag.
- Delete V1 layer only after parity and QA signoff.

## 4.2 Store strategy

- Keep a single Pinia instance.
- Keep shared platform/domain stores (auth, config, system context, API-backed stores) during migration.
- Create V2-specific UI stores for presentation state where needed (panel open state, local UI preferences, table density, etc.).
- Use versioned persistence keys for V2 UI state to avoid collisions.
- Remove V1 stores/components after full migration and stabilization.

## 4.3 Design system strategy

- Implement new design tokens first (Latte + Mocha).
- Build reusable V2 components before module migration.
- Enforce shared page templates for list, detail, and modal screens.

### 4.3.1 Design reference map (Pencil)

Primary source of truth:

- `ui/ux-audit-2026-02-26-1426/new-design.pen`

Component baseline frame (use for 1:1 visual parity checks):

- `Design System / Components / Latte` (node id: `o41qe`)

Key component specimens in `o41qe`:

- Buttons: Primary `HbLao`, Outline `lXeK5`, Outline Small `KYLbY`
- Fields: Email `wAhfs`, Password `6i7JZ`
- Dropdown: Trigger `cziSt`, Menu `coHnK`
- Dialogs (confirm overlays): Neutral `3COwp`, Destructive `bYTHD`
- Drawers: List `H1pZG`, Form `bAHLT`
- Toasts: Notice `Dvbui`, Info `zuMCk`, Success `cTCmg`, Error `pOC0f`
- Inline banners: Notice `4Zf6e`, Info `tHwBb`, Success `rjQjc`, Error `NheDG`

Implementation reference locations in `@ui/`:

- Route-aware wrapper components: `src/volt/`
- Shared V2 primitives/patterns: `src/components/v2/`
- Component parity sandbox route `/__v2/components`: `src/views/system-v2/V2ComponentLibraryView.vue`
- Token parity sandbox route `/__v2/tokens`: `src/views/system-v2/V2TokenVisualTestView.vue`

#### Mandatory behavior (no invention)

Implementation must match Pencil strictly. Do not invent UI in code.

If a needed element/state is not present in Pencil:

- Present options and get explicit user approval before implementing.
- Log the approval decision in the execution log with rationale and impacted components/routes.

## 5. Success Metrics

1. 100% of prioritized routes render via V2 layout/components.
2. No unresolved P1 UX gaps from `master-report.md`.
3. No regression in auth/session/API behavior.
4. Keyboard navigation and a11y checks pass for core flows.
5. V1-only component imports are removed from active routes.

## 6. Scope by Release Wave

- Wave 0: Planning and foundation.
- Wave 1: Tokens, shell, global scope/gating patterns, auth.
- Wave 2: SSP list/detail and system security plans core editor views.
- Wave 3: System + Controls + Workflows.
- Wave 4: Dashboards + Evidence + Inventory + Risk/POAM.
- Wave 5: Admin and long-tail routes.
- Wave 6: Full cutover, cleanup, hardening.

## 7. Detailed Task List (Tracker)

Legend: `[ ]` not started, `[~]` in progress, `[x]` done, `[-]` blocked.

## 7.1 Program setup and governance

- [x] P0-01 Create migration branch strategy and PR slicing rules (small vertical slices).
- [x] P0-02 Define definition-of-done checklist for each migrated route.
- [x] P0-04 Create route inventory spreadsheet from `src/router/index.ts` with migration status column.
- [x] P0-05 Tag each route by module, complexity, and dependency risk.
- [x] P0-06 Define release gating criteria (functional parity, UX parity, accessibility, visual QA).

Governance artifacts:

- `ui/ux-audit-2026-02-26-1426/migration-governance.md`
- `ui/ux-audit-2026-02-26-1426/route-inventory.md`

## 7.2 Foundations: tokens, typography, and theming

- [x] P1-01 Add V2 token map from `new-design.pen` variables to CSS variables.
- [x] P1-02 Implement Latte and Mocha themes in app CSS with deterministic token naming.
- [x] P1-03 Add Space Grotesk and JetBrains Mono font loading and fallback stack.
- [x] P1-04 Define typography scale utilities (title, section, label, body, meta).
- [x] P1-05 Implement zero-radius rule and border standards as reusable utilities.
- [x] P1-06 Implement semantic color tokens (success/warn/error/info).
- [x] P1-07 Validate contrast ratios for all token combinations used in key components.
- [x] P1-08 Add visual test page for tokens (colors, type scale, spacing, border usage).
- [x] P1-09 Add theme regression snapshot test baseline.

## 7.3 Foundations: V2 architecture and routing

- [x] P2-01 Add V2 layout scaffold (guest and app variants).
- [x] P2-02 Add route-level UI version switch mechanism (meta or feature flag).
- [x] P2-03 Add V2 navigation shell container preserving existing router behavior.
- [x] P2-04 Ensure PrimeVue services (toast/confirm/tooltip) render with V2 wrappers.
- [x] P2-05 Introduce `ui-v2` store namespace for V2-only presentation state.
- [x] P2-06 Version localStorage/persist keys for V2 UI state.
- [x] P2-07 Add migration guard to avoid mixed V1/V2 component rendering in the same page.
- [x] P2-08 Add instrumentation hook for page-level migration status.

## 7.4 Foundations: shared UX patterns (must be built before mass migration)

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

## 7.5 V2 component library implementation

Design lookup quick link: see `4.3.1 Design reference map (Pencil)` for node ids and local implementation locations.

### Base controls

- [x] P4-01 V2 button set (primary, secondary, ghost, danger, small variants).
- [x] P4-02 V2 input controls (text, password, textarea, select, multiselect, date).
- [x] P4-03 V2 checkbox/radio/toggle controls with accessible states.
- [x] P4-04 V2 badge/tag/chip components with semantic variants.
- [x] P4-05 V2 table primitives (header, row, cell actions, pagination).
- [x] P4-06 V2 tabs component consistent across all detail pages.
- [x] P4-07 V2 dialogs/drawers (create/edit/delete confirmation patterns).
- [x] P4-08 V2 inline alert/banner/toast patterns.

### Interaction and validation

- [x] P4-09 Implement consistent required field marker and helper text rules.
- [x] P4-10 Implement inline field error rendering standard.
- [x] P4-11 Implement form-level error summary with first-error focus.
- [x] P4-12 Standardize destructive action hierarchy (overflow + confirmation).
- [x] P4-13 Standardize status chips and human-readable status text mapping.

### Quality for component library

- [x] P4-14 Add component story/demo pages for each primitive.
- [x] P4-15 Add unit tests for core interactive states.
- [x] P4-16 Add keyboard and focus-order checks for dialogs/forms/tables.

## 7.6 Wave 1 migration: auth and global shell

- [x] W1-01 Migrate auth layout to V2 (guest shell).
- [x] W1-02 Migrate Login view using V2 form template.
- [x] W1-03 Migrate Forgot Password view using V2 form template.
- [x] W1-04 Migrate Password Reset view using V2 form template.
- [x] W1-05 Migrate SSO callback loading/error states.
- [x] W1-06 Migrate logout confirmation view/dialog.
- [x] W1-07 Validate auth flows under success, error, and timeout conditions.
- [x] W1-08 Migrate app shell (sidebar + header + content container).
- [x] W1-09 Surface Active SSP indicator globally in app shell.
- [x] W1-10 Validate responsive behavior (desktop + mobile breakpoints).

## 7.7 Wave 2 migration: SSP and system security plan core

- [x] W2-01 Migrate SSP list screen (default/loading/error/empty variants).
- [x] W2-02 Implement stateful active-plan row behavior and feedback toast.
- [x] W2-03 Migrate SSP detail overview screen.
- [x] W2-04 Migrate SSP detail characteristics screen.
- [x] W2-05 Migrate SSP detail implementation overview screen.
- [x] W2-06 Migrate SSP detail implementation users screen.
- [x] W2-07 Migrate SSP detail implementation components screen.
- [x] W2-08 Migrate SSP detail implementation authorizations screen.
- [x] W2-09 Migrate SSP detail controls screen and requirement drill-down states.
- [x] W2-10 Migrate SSP detail compliance screen.
- [x] W2-11 Migrate SSP detail JSON screen.
- [x] W2-12 Migrate all SSP loading/error/no-data/no-profile states.

## 7.8 Wave 3 migration: System, Controls, Workflows

### System module

- [x] W3-01 Migrate System overview tab.
- [ ] W3-02 Migrate System users tab and create/edit dialogs.
- [ ] W3-03 Migrate System components tab and create/edit dialogs.
- [ ] W3-04 Migrate leveraged authorizations tab and create/edit dialogs.
- [ ] W3-05 Replace raw-ID inputs with assisted selection where applicable.

### Controls module

- [ ] W3-06 Migrate Controls list/tree layout and search panel.
- [ ] W3-07 Migrate control details drawer and ensure deterministic open behavior.
- [ ] W3-08 Migrate controls empty-search and no-details states with clear copy.
- [ ] W3-09 Migrate secondary gate (no linked profile) with direct corrective CTA.
- [ ] W3-10 Validate keyboard navigation for tree, rows, and drawer interactions.

### Workflow definitions and instances

- [ ] W3-11 Migrate Workflow Definitions list/create.
- [ ] W3-12 Migrate Workflow Definition detail tabs (Overview, Steps, Controls, JSON).
- [ ] W3-13 Migrate Workflow Instances list/create/filters.
- [ ] W3-14 Migrate Workflow Instance detail tabs (Overview, Roles, Executions, JSON).
- [ ] W3-15 Migrate execution dialogs and detail panels.
- [ ] W3-16 Normalize status labels and badges across workflow screens.
- [ ] W3-17 Validate all workflow form validation/error states.

## 7.9 Wave 4 migration: Dashboards, Evidence, Inventory, Risk/POAM

### Dashboards

- [ ] W4-01 Migrate dashboards list with safe action hierarchy.
- [ ] W4-02 Migrate dashboard create/edit forms with full validation behavior.
- [ ] W4-03 Migrate dashboard detail screens if applicable.

### Evidence

- [ ] W4-04 Migrate evidence list/search screen with improved density rules.
- [ ] W4-05 Migrate evidence create/update forms with standardized validation.
- [ ] W4-06 Migrate evidence detail and history views.
- [ ] W4-07 Clarify evidence versioning labels and timeline presentation.

### Inventory

- [ ] W4-08 Migrate inventory list and filter panel.
- [ ] W4-09 Ensure source filter behavior is functional or relabeled clearly.
- [ ] W4-10 Migrate inventory detail affordance and interaction clarity.

### Risk register and POA&M

- [ ] W4-11 Migrate risk register list/detail flows.
- [ ] W4-12 Migrate POA&M list/detail and tabbed editor flows.
- [ ] W4-13 Migrate POA&M create/edit forms with standardized validation.

## 7.10 Wave 5 migration: admin and long-tail modules

- [ ] W5-01 Migrate admin import screens and disabled-state guidance.
- [ ] W5-02 Migrate catalogs list/detail/create/edit.
- [ ] W5-03 Migrate profiles list/detail/create/edit/merge.
- [ ] W5-04 Migrate component definitions list/detail/create/edit.
- [ ] W5-05 Migrate assessment plans list/detail/create/edit.
- [ ] W5-06 Migrate assessment results list/detail/create/edit.
- [ ] W5-07 Migrate users/roles/parties admin screens.
- [ ] W5-08 Migrate remaining miscellaneous routes (preferences/about/etc.).

## 7.11 Quality engineering and verification (all waves)

- [ ] Q-01 Add route-level visual regression coverage for migrated pages.
- [ ] Q-02 Add smoke E2E tests for auth, SSP selection, and major module entry paths.
- [ ] Q-03 Add E2E tests for critical create/edit/delete flows per module.
- [ ] Q-04 Add accessibility checks (focus trap, labels, aria, keyboard paths).
- [ ] Q-05 Add performance baseline for shell, large tables, and key editors.
- [ ] Q-06 Verify dark/light theme parity for all migrated pages.
- [ ] Q-07 Verify loading/empty/error states exist for every data-fetching page.

## 7.12 Cutover and cleanup

- [ ] C-01 Switch remaining routes to V2 layout/components.
- [ ] C-02 Remove V1 UI components no longer referenced.
- [ ] C-03 Remove V1-only styles and obsolete token aliases.
- [ ] C-04 Remove V1 UI-only stores and persisted keys.
- [ ] C-05 Consolidate duplicated composables introduced during migration.
- [ ] C-06 Run full regression and fix final parity gaps.
- [ ] C-07 Update documentation and onboarding for V2 architecture.
- [ ] C-08 Tag release and archive migration tracker as complete.

## 8. Store Migration Plan (Detailed)

## 8.1 During migration

1. Keep one Pinia root.
2. Keep shared stores for auth/config/domain APIs.
3. Add V2 UI stores for presentation-only state.
4. Avoid store-id and persisted-key collisions.
5. Encapsulate V2 view shaping in composables to limit churn.

## 8.2 After each module cutover

1. Remove V1 view imports for that module.
2. Remove V1-only UI state references in that module.
3. Delete dead V1 utility code discovered by static search.

## 8.3 At full cutover

1. Remove global V1 wrapper registration.
2. Delete remaining V1 UI stores.
3. Migrate localStorage keys if needed and add one-time cleanup.
4. Verify no route imports V1 components.

## 9. Risks and Mitigations

- Risk: Mixed V1/V2 components on one page cause visual and behavior drift.  
  Mitigation: route-level version gate and migration guard.

- Risk: Persisted state collisions between V1 and V2 UI stores.  
  Mitigation: versioned keys and migration map.

- Risk: Migration stalls due to over-large PRs.  
  Mitigation: enforce vertical slices and wave checkpoints.

- Risk: Regressions in prerequisite and active-scope behavior.  
  Mitigation: dedicated E2E suite for SSP selection/switching and gating flows.

- Risk: Accessibility regressions in new dialogs/tables.  
  Mitigation: a11y checks required in definition of done.

## 10. Dependencies

- Approved token values and typography from `new-design.pen` and style guides.
- Product/UX signoff on global Active SSP behavior.
- Engineering bandwidth for route-by-route migration and QA.
- Test environment with representative data for all major modules.

## 11. Definition of Done (Per Route Family)

A route family is done only when all are true:

1. Route renders via V2 layout/components.
2. Functional parity validated against V1 behavior.
3. Loading/empty/error and validation states implemented.
4. Keyboard and screen-reader basics verified.
5. Visual QA approved against Pencil design.
6. Route-level tests added/updated and passing.
7. No remaining imports from V1-only UI components for that route family.
8. Pencil node id(s) referenced for changed UI, or explicit user-approved deviation logged.

## 12. Immediate Next Actions (Week 1)

- [x] N-01 Finalize route inventory and assign wave ownership.
- [x] N-02 Implement token/theme foundation and font stack.
- [x] N-03 Implement V2 app/guest layout scaffolds and route switch mechanism.
- [x] N-04 Deliver Active SSP indicator + prerequisite gate components.
- [~] N-05 Migrate Auth flows end-to-end as first vertical slice.

## 13. Execution Log

- 2026-03-03: Implemented V2 auth vertical slice and set `/auth/*` routes to V2 views.
- 2026-03-03: Added Latte/Mocha V2 design tokens and semantic color variables in `src/assets/main.css`.
- 2026-03-03: Added Space Grotesk + JetBrains Mono font loading in `index.html`.
- 2026-03-03: Added `GuestV2Layout` with redesigned two-column auth shell.
- 2026-03-03: Added V2 auth primitives (`AuthPanelCard`, `AuthInput`, `AuthPrimaryButton`).
- 2026-03-03: Added V2 auth views for login, forgot password, password reset, SSO callback, and logout.
- 2026-03-03: Validation run: `npm run type-check`, `npm run build-only`, `npm run lint`, `npm run test:unit`.
- 2026-03-03: Tuned V2 typography scale to style guide defaults (body 14px, nav/labels 12px, meta 11px) and removed hardcoded tiny text sizes from V2 auth layouts/views.
- 2026-03-03: Simplified login feedback by removing success/error login toasts and keeping inline field/form messaging in V2 login view.
- 2026-03-03: Added route-level V1/V2 app shell switching via `meta.uiVersion`, with `AppV1Layout` and new `AppV2Layout` scaffolds.
- 2026-03-03: Added `ui-v2` namespaced Pinia store (`src/stores/ui-v2.ts`) with versioned localStorage keys.
- 2026-03-03: Added reusable V2 shared patterns: `ActiveSecurityPlanIndicator` and `PrerequisiteGate`.
- 2026-03-03: Migrated SSP list route to V2 (`/system-security-plans` and `/system-security-plans/create`) with loading/error/empty states and `Make Active / Active` row actions.
- 2026-03-03: Added return-to-origin continuation on SSP activation (`?next=`) with success feedback on the V2 list route.
- 2026-03-03: Migrated SSP detail route shell and overview to V2 (`/system-security-plans/:id` + overview child), while leaving deeper detail tabs for subsequent waves.
- 2026-03-03: Migrated SSP characteristics tab to V2 with architecture summaries and metrics (`system-security-plan-characteristics`).
- 2026-03-03: Added markdown-only migration governance (`migration-governance.md`) with PR slicing rules, route-family definition-of-done, and release gates.
- 2026-03-03: Added route family inventory (`route-inventory.md`) sourced from `src/router/index.ts`, including wave mapping, complexity/risk tagging, and migration status.
- 2026-03-03: Replaced V2 authenticated shell primitives with Pencil-aligned structure (brand header + numbered 240px sidebar nav + user footer) in `AppV2Layout`.
- 2026-03-03: Updated SSP V2 list/detail visual patterns to align more closely with Pencil frames (`MRRzf`, `fC9h5`, `Q7gWr`) and tab taxonomy.
- 2026-03-03: Migrated SSP implementation tab to V2 with nested section tabs (overview/users/components/authorizations), V2 card/table styles, and preserved create/edit/delete workflows.
- 2026-03-03: Migrated SSP compliance and JSON tabs to V2 views and switched router children to V2 imports for implementation/compliance/json.
- 2026-03-03: Migrated SSP controls tab to V2 and switched route import to `system-security-plans-v2/SystemSecurityPlanControlImplementationView.vue`, preserving requirement/statement/by-component editing flows.
- 2026-03-03: Finalized wave ownership in `route-inventory.md` (Waves 0-6 owner lanes) and marked Week 1 action `N-01` complete.
- 2026-03-03: Added V2 PrimeVue service wrappers by route context (toast, confirm dialog, tooltip) with V2 tokenized visual treatment on V2 routes.
- 2026-03-03: Added migration guard enforcing non-mixed V2 route chains (`meta.uiVersion = 'v2'`) and expanded V2 route metadata across auth + SSP child routes.
- 2026-03-03: Added global Active SSP indicator to `AppV2Layout` and a mobile top navigation pattern to close Wave 1 app shell responsive behavior gaps.
- 2026-03-03: Added route-level instrumentation hook (`ccf:ui-migration-status`) to emit page migration status payloads and store the latest payload on `window.__ccfLastUIMigrationStatus`.
- 2026-03-03: Added auth V2 flow tests for login + SSO callback success/error/timeout paths in `src/views/auth-v2/__tests__/AuthFlowsV2.spec.ts`.
- 2026-03-03: Completed Wave 1 app shell parity by adding V2 user menu controls (My Tasks, Preferences, Logout), sticky header/nav behavior, and desktop/mobile shell layout refinements.
- 2026-03-03: Added global Active SSP switcher modal to `ActiveSecurityPlanIndicator` to change active plan in place without route loss (`P3-02`).
- 2026-03-03: Added reusable V2 state panel pattern (`V2StatePanel`) and applied consistent loading/error/no-data/no-profile handling across SSP V2 views (`W2-12`).
- 2026-03-03: Migrated `/system` overview route to V2 (`system-v2/SystemOverviewView.vue`) while retaining legacy System child tabs for subsequent Wave 3 slices.
- 2026-03-03: Added shared V2 pattern components (`V2PageHeader`, `V2ListPageTemplate`, `V2DetailEditorTemplate`, `V2ModalFormTemplate`, `V2ContentSkeleton`) and applied them across SSP/System V2 views.
- 2026-03-03: Standardized SSP list/detail pages to shared list/detail templates with reusable error/empty actions and sticky detail actions, and aligned page headers to a common V2 pattern.
- 2026-03-03: Upgraded Active SSP switcher to use the new modal form template (labeled search, error summary area, and standardized modal actions) and completed P3-06 through P3-10 foundation patterns.
- 2026-03-04: Forced the UI theme to light mode in `useTheme` to enable direct visual comparison against Pencil's Latte design references.
- 2026-03-04: Completed P1-04 by adding explicit V2 typography utility tokens/classes (`ui-v2-title`, `ui-v2-section-title`, `ui-v2-card-title`, `ui-v2-metric`, `ui-v2-logo`) and applying them across V2 layouts, auth pages, shared patterns, and key System/SSP views.
- 2026-03-04: Completed P1-05 by adding reusable zero-radius/border utility classes (`ui-v2-radius-none`, `ui-v2-border-standard`, `ui-v2-surface-*`, `ui-v2-interactive`) and applying them in V2 shared components plus route-aware V2 dialog theming in `src/volt/Dialog.vue`.
- 2026-03-04: Completed P1-07 and P1-09 by adding `src/utils/uiV2Tokens.ts` and `src/utils/__tests__/uiV2Tokens.spec.ts` for automated key token contrast checks and inline token baseline snapshots for light/dark theme regression.
- 2026-03-04: Completed P1-08 by adding V2 token visual sandbox route `/__v2/tokens` (`ui-v2:tokens`) and `src/views/system-v2/V2TokenVisualTestView.vue` covering color swatches, typography samples, spacing scale, and border/radius utility previews.
- 2026-03-04: Completed 7.5 component-library route-aware implementation by upgrading volt wrappers for V2 variants (`Button`, `PrimaryButton`, `SecondaryButton`, `TertiaryButton`, `DangerButton`, `InputText`, `Password`, `Textarea`, `Select`, `MultiSelect`, `DatePicker`, `AutoComplete`, `Checkbox`, `RadioButton`, `ToggleSwitch`, `Badge`, `Chip`, `Tabs`, `TabList`, `TabPanels`, `Drawer`, `Message`, `Menu`) while preserving legacy behavior on V1 routes.
- 2026-03-04: Added shared V2 form/system primitives for validation and status consistency (`V2FormField`, `V2FieldError`, `V2FormErrorSummary`, `useV2FormValidation`, `V2StatusChip`, `V2InlineAlert`, `V2DestructiveActionMenu`, `v2Status` mapping).
- 2026-03-04: Added component demo/story sandbox route `/__v2/components` (`ui-v2:components`) via `src/views/system-v2/V2ComponentLibraryView.vue` with live examples for buttons, controls, table primitives, tabs, dialogs/drawers, alerts, status chips, and destructive-action hierarchy.
- 2026-03-04: Added and passed component-library tests (`src/volt/__tests__/v2RouteStyles.spec.ts`, `src/volt/__tests__/dialogFocus.spec.ts`, `src/components/v2/forms/__tests__/V2FormErrorSummary.spec.ts`, `src/components/v2/primitives/__tests__/V2StatusChip.spec.ts`, `src/utils/__tests__/v2Status.spec.ts`).
- 2026-03-04: Re-aligned V2 light-mode component styling to Pencil `new-design.pen` Latte baseline frame `o41qe` by syncing light token values and updating V2 wrappers (`Button*`, inputs/selects, dialogs/drawers, menu, toast/message) to match component geometry, typography, and color usage from `o41qe`.
- 2026-03-04: Refined V2 confirm dialog parity with Pencil Latte specs (`3COwp`, `bYTHD`) in `src/volt/ConfirmDialog.vue` by removing duplicate shell border, matching action order/spacing, and enforcing accept-button focus so Enter/Escape keyboard hints map to actual behavior.
- 2026-03-04: Updated V2 base modal styling in `src/volt/Dialog.vue` and component-library preview width to align with Latte dialog style choices (single-surface shell, 32px Space Grotesk title, 20/16/20 spacing rhythm, JetBrains body copy, and V2 outline close control).
- 2026-03-04: Approved and implemented Characteristics diagram editing interaction as a right-side V2 Drawer (explicit user approval for unspecified Pencil overlay state), embedding `DrawIODiagramEditor` for `ADD DIAGRAM` and `EDIT` while preserving existing diagram CRUD endpoints in `src/views/system-security-plans-v2/SystemSecurityPlanCharacteristicsView.vue`.
- 2026-03-04: Updated Characteristics diagram editor container to a full-screen V2 Drawer to provide usable draw.io canvas width while retaining Pencil-aligned tab cards/list/actions and existing CRUD behavior.
- 2026-03-04: Added full-screen Characteristics editor header save action and metadata fields (Name/Description) that flow through draw.io export and existing PUT persistence, enabling in-UI diagram naming/description updates.
- 2026-03-04: Removed duplicate in-editor draw.io save/exit buttons in Characteristics by configuring embed mode (`noSaveBtn=1`, `saveAndExit=0`, `noExitBtn=1`) and keeping the drawer header `SAVE DIAGRAM` as the primary save action.
- 2026-03-04: Compacted Characteristics editor controls into a single Name/Description row (removed category block) and configured draw.io embed mode (`configure=1` + injected UI CSS) to hide Extras and Help menus for a cleaner focused editing surface.
- 2026-03-04: Corrected draw.io menubar-hiding selector to account for trailing status element (`.geStatus`), ensuring both `Extras` and `Help` are actually hidden in the embedded Characteristics editor.
