# Dashboard Redesign - Developer Handoff

Audit package: `ux-audit-2026-02-26-1426`
Target: Replace post-login Evidence landing with a true workspace dashboard
Prototype: `ux-audit-2026-02-26-1426/new-design.pen`
Design frames:

- `App / Dashboard / Overview` (`3p5KE`)
- `App / Dashboard / No Active Plan` (`oxG8S`)
- `App / Dashboard / Overview / Latte` (`PdDJK`)
- `App / Dashboard / No Active Plan / Latte` (`X5tBb`)

Style guides:

- Dark: `webapp-01-industrialtechnical_light`
- Light: Catppuccin Latte palette (as mapped in `.pen` theme variables)

Viewport: Desktop web `1440x1020` reference (must still read cleanly at `1440x900` with page scroll)

## 1) Goals

- Replace evidence-first home with a dashboard that answers: what scope am I in, what is healthy, what is urgent, what should I do next.
- Make Active SSP a first-class concept visible in the shell and on the dashboard.
- Standardize the no-prerequisite state with one clear recovery path.
- Reduce action risk by prioritizing open/view actions and de-emphasizing destructive actions.
- Fix known UX issues called out in the audits:
  - `A2-UX-EVID-02` (blank chart states)
  - `A2-UX-EVID-06` (destructive action hierarchy)
  - `A2-UX-EVID-08`, `A1-UX-EVID-03` (missing active SSP context)
  - `A1-UX-EVID-01`, `A5-UX-EVID-01`, `A3-UX-EVID-01`, `A4-UX-EVID-01` (inconsistent/no-CTA SSP gating)

## 2) Scope

In scope:

- `/` becomes the dashboard entry route (active and no-active states).
- Keep `/evidence` as the Evidence workspace (not the default home).
- Dashboard sections:
  - Active Plan context banner
  - KPI cards (compliance, assessed, open tasks, agents online)
  - Trend cards (compliance over time, agent health)
  - Action cards (My Tasks Due Soon, Upcoming Workflow Runs, Saved Views)
- No Active Plan variant with a single SSP activation method (list row action only).
- Shell alignment with design: user identity moved to bottom of sidebar.
- Dark + Latte variants following the prototype.

Out of scope (unless expanded later):

- Rebuilding Evidence CRUD flows (`/evidence/create`, `/evidence/:id/update`, etc.).
- New backend contracts or schema changes.
- Mobile redesign.

## 3) Screens and States (Desktop)

Use these prototype frames as implementation references:

- Active dashboard (dark): `App / Dashboard / Overview` (`3p5KE`)
- No active SSP (dark): `App / Dashboard / No Active Plan` (`oxG8S`)
- Active dashboard (light/latte): `App / Dashboard / Overview / Latte` (`PdDJK`)
- No active SSP (light/latte): `App / Dashboard / No Active Plan / Latte` (`X5tBb`)

Route/state mapping:

- `/` + active SSP -> Overview state
- `/` + no active SSP -> No Active Plan state
- `/evidence` -> existing Evidence search/list experience

## 4) Layout Spec

Global composition:

- Canvas: `1440x1020` design frame
- Top app header: `64px`
- Main area: horizontal split
  - Sidebar: `240px` fixed
  - Content: fill

Sidebar:

- Upper block: numbered navigation list
- Lower block: user identity footer (`USER` / `ADMIN`), separated with top border

Content:

- Padding: `[32, 40]` (vertical, horizontal)
- Section gap: `32`
- Section order:
  1. Compact page header (title + one-line helper)
  2. Active plan banner
  3. KPI row (4 cards)
  4. Trends row (2 cards)
  5. Actions row (3 cards)

Actions row sizing behavior:

- Keep row items single-line, compact labels.
- Prevent text collisions by ensuring item label width is constrained/truncated (`truncate`) and status/action keeps fixed width.
- Confirm no overlap at `1440x900` viewport.

## 5) Affected Components & Views

Routes and views:

- Home route switch:
  - `src/router/index.ts` (`name: home`, path `/`)
- Existing dashboard module:
  - `src/views/dashboard/IndexView.vue`
  - `src/views/dashboard/DashboardChart.vue`
  - `src/views/dashboard/CompliancePostureWidget.vue`
- Evidence route kept as non-home:
  - `src/views/evidence/IndexView.vue`

Shell/navigation:

- `src/views/layouts/App.vue` (header scope indicator placement)
- `src/views/LeftSideNav.vue` (sidebar footer user placement)
- `src/components/ProfileDropdown.vue` (optional simplification if user identity is shown in nav footer)

Context and data sources:

- Active SSP state: `src/stores/system.ts`
- Compliance preview logic:
  - `src/composables/useProfileCompliance.ts`
  - `src/types/compliance.ts`
  - existing examples in `src/views/system/OverviewView.vue`
- My tasks:
  - `src/composables/workflows/useMyAssignments.ts`
  - `src/views/MyTasksView.vue`
- Workflow instances:
  - `src/composables/workflows/useWorkflowInstances.ts`
  - `src/types/workflows.ts`
- Agent health:
  - `src/stores/heartbeats.ts`
- Saved views:
  - `src/views/dashboard/IndexView.vue`
  - `src/views/control-implementations/partials/DashboardEvidenceCounter.vue`

## 6) File Manifest (Expected Touch List)

Minimum expected edits:

- `src/router/index.ts`
- `src/views/dashboard/IndexView.vue`
- `src/views/layouts/App.vue`
- `src/views/LeftSideNav.vue`

Recommended new dashboard files:

- `src/views/dashboard/WorkspaceOverviewView.vue`
- `src/views/dashboard/WorkspaceNoActivePlanView.vue`
- `src/components/dashboard/DashboardKpiCard.vue`
- `src/components/dashboard/DashboardTrendCard.vue`
- `src/components/dashboard/DashboardActionListCard.vue`
- `src/components/dashboard/ActivePlanBanner.vue`
- `src/components/dashboard/NoActivePlanGate.vue`
- `src/composables/dashboard/useWorkspaceDashboard.ts`

Optional style/theme support files:

- `src/assets/main.css` (dashboard-scoped tokens/utilities)
- `index.html` (ensure Space Grotesk + JetBrains Mono are available)

Suggested tests:

- `src/views/dashboard/__tests__/WorkspaceOverviewView.spec.ts`
- `src/views/dashboard/__tests__/WorkspaceNoActivePlanView.spec.ts`
- `src/router/__tests__/home-route.spec.ts`

## 7) Style Guide Mapping (Dark + Latte)

Typography:

- Display/headings: Space Grotesk
- UI/body/labels: JetBrains Mono
- Labels/buttons/nav in uppercase with widened tracking

Core structure:

- Radius: `0` everywhere
- Borders: `1px` (primary structure)
- Accent emphasis: left-edge accent bars and yellow/latte-accent highlights

Color mapping (use tokens, avoid hardcoded values in components):

- Dark (industrial): `#18181B`, `#0F0F10`, `#141415`, `#27272A`, `#FACC15`
- Latte: `#eff1f5`, `#dce0e8`, `#e6e9ef`, `#ccd0da`, `#df8e1d`
- Semantic:
  - success: dark `#22C55E` / latte `#40a02b`
  - error: dark `#EF4444` / latte `#d20f39`
  - info: dark `#3B82F6` / latte `#1e66f5`

Use the `.pen` theme variables as the implementation source of truth (`mode=dark|latte`).

## 8) Interaction Logic and Edge Cases

### Active SSP state

- Source of truth: `useSystemStore().system.securityPlan`.
- If missing, render No Active Plan dashboard state.
- No Active Plan state must expose one activation path only:
  - list row action `MAKE ACTIVE`.
- Do not duplicate with a second top-level “Select Plan” action.

### Gating copy and recovery

- Use plain language (“Select a System Security Plan”).
- Explain what is unlocked (System, Controls, Workflows).
- After activation, remain on `/` and render active overview immediately.

### Widget loading/empty/error

- Every metric/trend/action panel needs explicit states:
  - loading skeleton
  - empty (“No data yet”)
  - inline error + retry affordance
- This addresses the blank-panel issue from `A2-UX-EVID-02`.

### Chart behavior

- Compliance trend: use real compliance-over-time data (existing chart data source and parser patterns from Evidence/Dashboard chart files).
- Agent trend: use heartbeat over-time endpoint.

### Action hierarchy

- In Saved Views, primary action is `OPEN`.
- Destructive actions move to overflow menu with confirmation (`A2-UX-EVID-06`).

### Dense-row readability

- Keep list rows single-line as designed.
- Apply truncation (`truncate`, `min-w-0`) on left item labels and fixed-width right status/actions to prevent overlap.

## 9) Implementation Priority (Start Here)

1. Switch `/` from Evidence to dashboard route/view (`src/router/index.ts`).
2. Implement Active/No-Active state branching using `useSystemStore`.
3. Build shell-consistent dashboard layout (header/sidebar/content grid).
4. Move user identity to sidebar footer and keep header focused on scope.
5. Wire KPI/trend/action widgets to existing APIs/composables.
6. Apply action hierarchy fixes for Saved Views (open first, delete secondary).
7. Add robust loading/empty/error states for all cards and charts.
8. QA both themes against the four prototype frames.

## 10) Acceptance Criteria / QA Checklist

- Home route `/` lands on dashboard, not Evidence.
- Active SSP is visible in shell/dashboard context and easy to change.
- No Active Plan state has one clear activation path (list row action only).
- Dashboard renders correctly in dark and latte variants.
- At `1440x900`, no text overlaps in bottom action cards; layout remains readable with vertical scroll.
- Compliance/agent trend cards do not appear as unexplained blank boxes.
- Saved Views actions prioritize open/view; destructive actions are secondary + confirmed.
- Keyboard navigation remains safe and predictable in dashboard actions.

## 11) References

- Expert analysis: `ux-audit-2026-02-26-1426/ux-expert-analysis.md`
- Audit findings:
  - `ux-audit-2026-02-26-1426/reports/dashboards-evidence.md`
  - `ux-audit-2026-02-26-1426/reports/global-prereq-patterns.md`
  - `ux-audit-2026-02-26-1426/reports/workflows.md`
  - `ux-audit-2026-02-26-1426/reports/system-inventory.md`
  - `ux-audit-2026-02-26-1426/reports/controls.md`
- Prototype file and screen IDs:
  - `ux-audit-2026-02-26-1426/new-design.pen`
  - `3p5KE`, `oxG8S`, `PdDJK`, `X5tBb`
