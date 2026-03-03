# PRD: UI V2 Migration and Full Cutover

Status: Draft v1.0  
Last updated: 2026-03-03  
Primary scope: `@ui/` frontend redesign and full migration to the new Pencil design (`new-design.pen`)

## 1. Context

The new UI has already been designed in `ui/ux-audit-2026-02-26-1426/new-design.pen` with Latte/Mocha style guides.  
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

- [ ] P0-01 Create migration branch strategy and PR slicing rules (small vertical slices).
- [ ] P0-02 Define definition-of-done checklist for each migrated route.
- [ ] P0-04 Create route inventory spreadsheet from `src/router/index.ts` with migration status column.
- [ ] P0-05 Tag each route by module, complexity, and dependency risk.
- [ ] P0-06 Define release gating criteria (functional parity, UX parity, accessibility, visual QA).

## 7.2 Foundations: tokens, typography, and theming

- [ ] P1-01 Add V2 token map from `new-design.pen` variables to CSS variables.
- [ ] P1-02 Implement Latte and Mocha themes in app CSS with deterministic token naming.
- [ ] P1-03 Add Space Grotesk and JetBrains Mono font loading and fallback stack.
- [ ] P1-04 Define typography scale utilities (title, section, label, body, meta).
- [ ] P1-05 Implement zero-radius rule and border standards as reusable utilities.
- [ ] P1-06 Implement semantic color tokens (success/warn/error/info).
- [ ] P1-07 Validate contrast ratios for all token combinations used in key components.
- [ ] P1-08 Add visual test page for tokens (colors, type scale, spacing, border usage).
- [ ] P1-09 Add theme regression snapshot test baseline.

## 7.3 Foundations: V2 architecture and routing

- [ ] P2-01 Add V2 layout scaffold (guest and app variants).
- [ ] P2-02 Add route-level UI version switch mechanism (meta or feature flag).
- [ ] P2-03 Add V2 navigation shell container preserving existing router behavior.
- [ ] P2-04 Ensure PrimeVue services (toast/confirm/tooltip) render with V2 wrappers.
- [ ] P2-05 Introduce `ui-v2` store namespace for V2-only presentation state.
- [ ] P2-06 Version localStorage/persist keys for V2 UI state.
- [ ] P2-07 Add migration guard to avoid mixed V1/V2 component rendering in the same page.
- [ ] P2-08 Add instrumentation hook for page-level migration status.

## 7.4 Foundations: shared UX patterns (must be built before mass migration)

- [ ] P3-01 Build global "Active SSP" scope indicator component.
- [ ] P3-02 Build SSP switcher interaction (change active plan without route loss).
- [ ] P3-03 Build standardized prerequisite gate component (title/body/CTA/help).
- [ ] P3-04 Implement return-to-origin behavior after prerequisite completion.
- [ ] P3-05 Build stateful "Make active / Active" list-row pattern.
- [ ] P3-06 Build standardized page header pattern (title, metadata, primary actions).
- [ ] P3-07 Build standardized list page template (filters + table + empty state).
- [ ] P3-08 Build standardized detail/editor template (tabs + sticky actions).
- [ ] P3-09 Build standardized modal form template (labels, required, errors, buttons).
- [ ] P3-10 Build loading/empty/error skeleton components for all major content blocks.

## 7.5 V2 component library implementation

### Base controls

- [ ] P4-01 V2 button set (primary, secondary, ghost, danger, small variants).
- [ ] P4-02 V2 input controls (text, password, textarea, select, multiselect, date).
- [ ] P4-03 V2 checkbox/radio/toggle controls with accessible states.
- [ ] P4-04 V2 badge/tag/chip components with semantic variants.
- [ ] P4-05 V2 table primitives (header, row, cell actions, pagination).
- [ ] P4-06 V2 tabs component consistent across all detail pages.
- [ ] P4-07 V2 dialogs/drawers (create/edit/delete confirmation patterns).
- [ ] P4-08 V2 inline alert/banner/toast patterns.

### Interaction and validation

- [ ] P4-09 Implement consistent required field marker and helper text rules.
- [ ] P4-10 Implement inline field error rendering standard.
- [ ] P4-11 Implement form-level error summary with first-error focus.
- [ ] P4-12 Standardize destructive action hierarchy (overflow + confirmation).
- [ ] P4-13 Standardize status chips and human-readable status text mapping.

### Quality for component library

- [ ] P4-14 Add component story/demo pages for each primitive.
- [ ] P4-15 Add unit tests for core interactive states.
- [ ] P4-16 Add keyboard and focus-order checks for dialogs/forms/tables.

## 7.6 Wave 1 migration: auth and global shell

- [ ] W1-01 Migrate auth layout to V2 (guest shell).
- [ ] W1-02 Migrate Login view using V2 form template.
- [ ] W1-03 Migrate Forgot Password view using V2 form template.
- [ ] W1-04 Migrate Password Reset view using V2 form template.
- [ ] W1-05 Migrate SSO callback loading/error states.
- [ ] W1-06 Migrate logout confirmation view/dialog.
- [ ] W1-07 Validate auth flows under success, error, and timeout conditions.
- [ ] W1-08 Migrate app shell (sidebar + header + content container).
- [ ] W1-09 Surface Active SSP indicator globally in app shell.
- [ ] W1-10 Validate responsive behavior (desktop + mobile breakpoints).

## 7.7 Wave 2 migration: SSP and system security plan core

- [ ] W2-01 Migrate SSP list screen (default/loading/error/empty variants).
- [ ] W2-02 Implement stateful active-plan row behavior and feedback toast.
- [ ] W2-03 Migrate SSP detail overview screen.
- [ ] W2-04 Migrate SSP detail characteristics screen.
- [ ] W2-05 Migrate SSP detail implementation overview screen.
- [ ] W2-06 Migrate SSP detail implementation users screen.
- [ ] W2-07 Migrate SSP detail implementation components screen.
- [ ] W2-08 Migrate SSP detail implementation authorizations screen.
- [ ] W2-09 Migrate SSP detail controls screen and requirement drill-down states.
- [ ] W2-10 Migrate SSP detail compliance screen.
- [ ] W2-11 Migrate SSP detail JSON screen.
- [ ] W2-12 Migrate all SSP loading/error/no-data/no-profile states.

## 7.8 Wave 3 migration: System, Controls, Workflows

### System module

- [ ] W3-01 Migrate System overview tab.
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

## 12. Immediate Next Actions (Week 1)

- [ ] N-01 Finalize route inventory and assign wave ownership.
- [ ] N-02 Implement token/theme foundation and font stack.
- [ ] N-03 Implement V2 app/guest layout scaffolds and route switch mechanism.
- [ ] N-04 Deliver Active SSP indicator + prerequisite gate components.
- [ ] N-05 Migrate Auth flows end-to-end as first vertical slice.
