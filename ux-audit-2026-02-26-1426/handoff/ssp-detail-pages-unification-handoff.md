# SSP Detail Pages Unification Handoff

## Background and Goal

This thread focused on analyzing the overlap and differences between the UI routes:

- `/system`
- `/system-security-plans`

and how both map to API behavior under `@api`.

The goal is to design a **single unified SSP detail experience** that removes duplication, keeps all existing functionality, and supports both:

- direct SSP-by-ID editing (`/system-security-plans/:id/...`)
- active SSP workflow (`/system/...`)

Runtime behavior was reviewed with `agent-browser` against `http://localhost:8000/` using the provided admin account, and code-level behavior was validated in the `ui/src` and `api/internal` codebases.

---

## What Was Analyzed

### UI code areas

- Routing and route trees:
  - `ui/src/router/index.ts`
- `/system` shell and child views:
  - `ui/src/views/SystemView.vue`
  - `ui/src/views/system/OverviewView.vue`
  - `ui/src/views/system/DiagramsView.vue`
  - `ui/src/views/system/UsersView.vue`
  - `ui/src/views/system/ComponentsView.vue`
  - `ui/src/views/system/AuthorizationsView.vue`
  - `ui/src/views/system/partials/ComponentDashboardsView.vue`
- `/system-security-plans` shell and child views:
  - `ui/src/views/system-security-plans/SystemSecurityPlanListView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanEditorView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanOverviewView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanCharacteristicsView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanSystemImplementationEditorView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanControlImplementationView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanComplianceView.vue`
  - `ui/src/views/system-security-plans/SystemSecurityPlanJSONView.vue`
- State and API wrappers:
  - `ui/src/stores/system.ts`
  - `ui/src/stores/system-security-plans.ts`
  - `ui/src/composables/axios/index.ts`
  - `ui/src/composables/useProfileCompliance.ts`

### API code areas

- SSP endpoint registration and handlers:
  - `api/internal/api/handler/oscal/system_security_plans.go`
  - `api/internal/api/handler/oscal/api.go`
- Compliance progress support:
  - `api/internal/api/handler/oscal/profiles.go`
  - `api/internal/api/handler/oscal/profile_compliance.go`
- Auth middleware and auth endpoint context:
  - `api/internal/api/middleware/auth.go`
  - `api/internal/api/handler/auth/auth.go`

---

## High-Level Result: Overlap vs Difference

## 1) Core similarity

Both route families are mostly different UX shells over the same SSP API surface:

- `/api/oscal/system-security-plans/:sspId/profile`
- `/api/oscal/system-security-plans/:sspId/system-characteristics`
- `/api/oscal/system-security-plans/:sspId/system-implementation/users`
- `/api/oscal/system-security-plans/:sspId/system-implementation/components`
- `/api/oscal/system-security-plans/:sspId/system-implementation/inventory-items`
- `/api/oscal/system-security-plans/:sspId/system-implementation/leveraged-authorizations`
- corresponding user/component/leveraged-authorization CRUD endpoints

Most of these are centrally owned by `system_security_plans.go`.

## 2) Biggest architectural difference

How `sspId` is determined:

- `/system` uses **active SSP from local storage store** (`useSystemStore().system.securityPlan?.uuid`).
- `/system-security-plans/:id` uses **route param id** and loads SSP by that id.

## 3) Endpoint usage differences

### `/system` route family emphasizes

- Active-plan dashboard/editor behavior
- Compliance preview endpoint usage:
  - `GET /api/oscal/profiles/:profileId/compliance-progress?includeControls=false&sspId=:sspId`
- Diagram editing mutations:
  - `POST|PUT|DELETE /api/oscal/system-security-plans/:sspId/system-characteristics/*/diagrams/*`
- Component dashboard/evidence integration not in SSP API namespace:
  - `POST /api/evidence/search`
  - `GET|POST|PUT /api/filters`

### `/system-security-plans` route family emphasizes

- SSP list/selection and SSP-by-id full editor flow
- List/export endpoints:
  - `GET /api/oscal/system-security-plans`
  - `GET /api/oscal/system-security-plans/:id/full`
- Full control implementation editing endpoints
- Full compliance view usage (typically with controls included)

---

## Runtime View Inventory (Detailed)

Environment used during runtime inspection:

- App URL: `http://localhost:8000/`
- Login succeeded and app shell loaded
- Active SSP in tests: "ToDo Demo Application System Security Plan" (`f8c1a2b3-d4e5-6f7a-8b9c-0d1e2f3a4b5c`)

## Global shell behavior (both route families)

- Left navigation present: Dashboards, System, Controls, Workflow Definitions, Workflow Instances, Risk Register, Inventory, Evidence
- Utility controls present: theme toggle, sidebar toggle
- User session area present with logout

## `/system-security-plans`

### `GET /system-security-plans` (list)

Observed features:

- Table with Title, Version, Last Modified, Actions
- Row actions:
  - `View` opens SSP editor
  - `JSON` downloads full JSON and shows success toast
  - `Set` marks row as Active SSP
- Active SSP badge shown in table
- Loading / error / empty states are implemented

`/system-security-plans/create` currently resolves to list behavior (no dedicated create UX surfaced in runtime).

### `GET /system-security-plans/:id` editor shell

Observed features:

- Header with SSP title + optional remarks
- Top-level tabs:
  - Overview
  - System Characteristics
  - System Implementation
  - Control Implementation
  - Compliance
  - JSON
- Error path toasts and redirects back to list

### `:id/overview`

Observed features:

- Metadata card and profile selector
- Actions card:
  - Edit Metadata
  - Edit System Characteristics
  - Edit Implementation
  - Edit Controls
  - Download JSON
- Edit mode notice indicating partial in-development functionality
- Statistics cards for users/components/inventory/leveraged auth
- System characteristics summary section

### `:id/system-characteristics`

Observed features:

- KPI-style metrics row:
  - Security Level
  - Authorization Status (+ days since)
  - Architecture Diagram count
  - Profile completeness
- System information hero card with disabled Edit button
- Description/sensitivity/date/remarks presentation
- Diagram category presentation with empty-state text if no diagrams

### `:id/system-implementation`

Observed features:

- Top summary metrics and distribution
- Inner tabs:
  - Overview
  - Users
  - Components
  - Authorizations

#### Users sub-tab

- List + Create User
- Row actions: Edit, JSON, Delete
- Create/Edit forms include:
  - UUID management
  - Required fields
  - roles and authorized privileges inputs
  - privilege functions performed add/remove

#### Components sub-tab

- List + Create Component
- Row actions: Edit, JSON, Delete
- Create/Edit forms include:
  - UUID
  - type/title/description/purpose
  - status state
  - protocols and port range structure

#### Authorizations sub-tab

- List + Create Authorization
- Empty-state guidance shown when no data
- Create dialog includes:
  - UUID generate
  - title
  - party UUID
  - date authorized
  - remarks
  - properties
  - links

### `:id/control-implementation`

Observed features:

- Editable description block and parameter list
- Stats for implemented requirements/statements/by-component counts
- `Add Requirement` action
- Requirement rows show control ids and actions:
  - Create Statement
  - Edit
  - Delete
- Create statement modal includes statement id, remarks, props, links

### `:id/compliance`

Observed features:

- Resolves attached profile first
- If no profile attached: informative message + link to overview
- If compliance data exists: detailed compliance panel
- If no compliance data: explicit empty-state message

### `:id/json`

Observed features:

- Large inline full JSON view
- Download JSON and Copy JSON actions

## `/system`

### `GET /system` shell behavior

- If no active SSP selected: blocking message with link to `/system-security-plans`
- If active SSP set: shows SSP title + tabs:
  - Overview
  - System Users
  - System Components
  - Leveraged Authorizations

### `/system` overview

Observed features:

- Metadata and profile select
- Compliance **preview** cards/progress bars
- Link to full compliance page under `/system-security-plans/:id/compliance`
- System characteristics summary fields
- Embedded diagrams editor section (authorization boundary/network architecture/data flow)

Notable behavior observed:

- `Add Diagram` in this screen is immediate create behavior (one click -> created + success toast), not a separate wizard/modal flow.

### `/system/users`

Observed features:

- Panel list of users + Create User
- Per-user actions: Edit / JSON / Delete
- Expanded detail area includes roles and authorized privileges
- Uses same form components as SSP editor system implementation users

### `/system/components`

Observed features:

- Panel list of components + Create Component
- Per-component actions: Dashboards / Edit / JSON / Delete
- Expanded details include purpose, protocols, status
- Dashboard side drawer appears from component action

Intended dashboard drawer features (from code and partial render path):

- Evidence linking section
- Linked dashboard list + view/unlink actions + evidence counters
- Create dashboard from baseline evidence + label conditions
- Link existing dashboard

### `/system/authorizations`

Observed features:

- Leveraged authorizations list + Create Authorization
- Empty-state message shown when no authorizations
- Create dialog fields: UUID/title/party/date/remarks/props/links

---

## Defects and Inconsistencies Identified

## 1) `/system/authorizations` create/edit SSP id bug

- In `ui/src/views/system/AuthorizationsView.vue`, forms are passed `:ssp-id="route.params.id"`.
- Route `/system/authorizations` has no `:id`, so create/edit can send undefined SSP id.
- Listing still works because list fetch uses `system.securityPlan?.uuid`.

Impact:

- likely create/edit failure or malformed endpoint path on submission.

## 2) Component dashboards drawer not rendering expected content reliably

- `ui/src/views/system/ComponentsView.vue` sets selected component from route param watcher.
- Watcher reacts to `route.params.componentId`, but selected component can remain unset until components list fetch timing catches up.
- Result observed: drawer opens with "Dashboards" shell, but expected Evidence Linking content may not appear.

## 3) Route/path inconsistency around component dashboards

- Runtime warning showed no match for `/system/components/:componentId/dashboards` in one navigation path.
- Another route shape `/system/components/dashboards/:componentId` appeared to load shell state.

Impact:

- route naming/pathing should be normalized to one canonical path to avoid broken deep links.

## 4) Editing capabilities split awkwardly across two route families

- `/system` includes functional diagram editing.
- `/system-security-plans/:id/system-characteristics` has richer presentation/KPIs but edit affordance is disabled.

Impact:

- users must mentally switch areas for related tasks and cannot rely on one SSP detail page for full editing.

## 5) Duplication creates maintenance risk

- Users/components/authorizations editing appears in both route families with near-duplicate logic.
- Different contexts for SSP id sourcing increases drift and bug risk.

---

## Unified Solution Proposed

### Canonical direction

Use `/system-security-plans/:sspId` as the **single SSP detail canonical route family**.

Keep `/system/*` as an alias for active plan workflow by redirecting to canonical routes.

### Proposed canonical route tree

- `/system-security-plans` (list/selector)
- `/system-security-plans/:sspId`
  - `''` overview
  - `architecture`
  - `implementation`
    - `overview`
    - `users`
    - `components`
    - `authorizations`
    - `inventory` (optional if needed)
  - `controls`
  - `compliance`
  - `json`

### Active SSP alias strategy

- `/system` -> redirect to `/system-security-plans/active`
- `/system-security-plans/active/...` -> resolve active UUID from `useSystemStore().system.securityPlan.uuid` and redirect to `/system-security-plans/:sspId/...`
- If no active SSP exists, show existing “SSP not selected” guidance and route to list.

### What to merge from each existing page

#### Keep as canonical shell

- `SystemSecurityPlanEditorView.vue` tab shell and id-based loading.

#### Unified Overview

Merge:

- metadata + actions + summary stats from `SystemSecurityPlanOverviewView.vue`
- compliance preview cards and profile attach behavior from `system/OverviewView.vue`

#### Unified Architecture

Merge:

- KPIs and characteristics presentation from `SystemSecurityPlanCharacteristicsView.vue`
- fully editable diagrams behavior from `system/DiagramsView.vue`

#### Unified Implementation

Combine:

- higher-level metrics block from `SystemSecurityPlanSystemImplementationEditorView.vue`
- richer CRUD list/detail UX from `/system` users/components/authorizations views
- component dashboards drawer once route and selected-component wiring are fixed

#### Keep canonical as-is (already unique and useful)

- Control Implementation
- Compliance
- JSON

### SSP context unification rule

All SSP detail subviews should derive `sspId` from one shared context/composable.

Priority:

1. explicit route param when present
2. resolved active alias id when using `/active`

Do not mix route param and store id ad hoc per page.

---

## Suggested Migration Plan

1. Build canonical `:sspId` route tree first while preserving old URLs.
2. Introduce `/system` redirects to canonical active alias path.
3. Migrate merged pages in this order:
   - overview
   - architecture
   - implementation
4. Normalize component dashboards path shape and selection logic.
5. Convert old `/system/users|components|authorizations` pages into redirects once parity is complete.
6. Remove duplicate logic and retain shared components.

---

## Decision Prompt from Thread

One explicit product choice still open:

- Keep `/system` permanently as an active-SSP shortcut alias, or remove it and require explicit `/system-security-plans/:id` navigation.

Recommendation made in-thread:

- Keep `/system` as a stable alias for active SSP (better operator ergonomics, avoids breaking expectations), but make canonical rendering live under `/system-security-plans/:id`.

---

## Final Thread Outcome

The analysis concluded that a unified SSP detail model is feasible with low backend risk because both route families already target the same major SSP endpoints. Most work is UI/routing/state consolidation and bug fixes around id source consistency, dashboards route normalization, and duplicated feature surfaces.

---

## UX Design Approach (Main SSP Layout First, Then Drill Down)

This section captures the recommended approach for designing the new SSP UX and UI, starting from the main SSP page and then drilling into details.

### Core framing

Treat this as an **information architecture and workflow unification** effort first, then visual redesign. Current UX debt is primarily from two competing models:

- active SSP workspace (`/system/*`)
- SSP-by-id editor (`/system-security-plans/:id/*`)

The redesign should make one model primary and keep the other as a shortcut.

### Step 1: Lock product decisions first (short workshop)

Define these before drawing high-fidelity screens:

1. Canonical SSP detail location (recommended: `/system-security-plans/:id`)
2. Active SSP behavior (recommended: keep active SSP as a first-class concept)
3. Editing pattern consistency (always editable vs explicit edit mode)

Use this handoff doc as the source inventory while deciding.

### Step 2: Design the main SSP page as an "SSP Library"

Design goals:

- Find SSP quickly
- Confirm/set Active SSP quickly
- Jump into SSP detail quickly

Recommended layout blocks:

- Header with core CTAs (Create/Import/etc.)
- Active SSP summary callout (title, profile, last modified, quick open)
- Search and filters (title, profile attached, modified range, completeness/compliance)
- List/table optimized for scanability (Title, Profile, Compliance %, Last Modified, Active)
- Row actions (Open, Set Active, Export JSON)

Required states:

- loading
- empty
- error
- no active SSP selected

### Step 3: Define one persistent SSP Detail shell

This is the canonical drill-down container.

Recommended shell elements:

- breadcrumb (`System Security Plans > {SSP}`)
- persistent SSP header (title, active badge, profile/sensitivity, last modified)
- global actions (Set Active, Export, Copy UUID, Open JSON)
- stable secondary navigation (tabs or left-nav)

Recommended top-level detail sections:

- Overview
- Architecture
- Implementation
- Controls
- Compliance
- JSON / Export

### Step 4: Make Overview a "work landing page"

The overview should answer immediately:

- What is this SSP?
- Which profile is attached?
- What is current compliance posture?
- What implementation work remains?
- Where should user go next?

Merge strengths from current implementations:

- metadata/actions/stats from `/system-security-plans/:id/overview`
- compliance preview and profile interaction from `/system`

### Step 5: Drill down with task-first section design

For each section, define:

- primary jobs to be done
- key objects and relationships
- key actions and success states
- links to adjacent sections

Section-specific guidance:

- Architecture: combine the rich summary view with actual diagram editing in one place.
- Implementation: keep consistent CRUD patterns across users/components/authorizations/inventory.
- Components: define stable home for dashboards/evidence linking (drawer or full page, but consistent).
- Controls: add scalability affordances (search/filter/grouping) for long requirement lists.
- Compliance: preserve detailed reporting and provide actionable links back to controls/implementation.

### Step 6: Prototype with realistic SSP data early

Use a real-sized SSP dataset (for example, ToDo Demo style data) to validate:

- long lists and scrolling behavior
- mixed completeness states
- sparse vs dense diagram coverage
- partial compliance scenarios

This avoids overfitting the design to small/ideal test content.

### Step 7: Define non-negotiable consistency rules

Codify these in design/system guidance:

- one SSP context source for all detail routes
- one clear place for diagram editing
- one implementation management model
- one export model and language
- one interaction pattern for create/edit/delete flows

---

## Open UX Strategy Question

A major directional question remains:

- Is the primary user someone who works daily in one Active SSP, or someone who frequently compares many SSPs?

Recommendation from this thread:

- Optimize primarily for daily Active SSP workflow, while preserving strong SSP Library search/filtering for multi-SSP navigation.

If research indicates heavy cross-SSP comparison usage, strengthen the main SSP Library with richer filtering and comparison affordances, and reduce emphasis on active-plan shortcuts.

---

## Design Iteration Update (2026-03-01)

This section captures the latest Pencil prototypes created in `new-design.pen` for SSP create/edit unification.

### Focused editor page mode decisions

- Use full-page focused editor surfaces for complex SSP create/edit flows.
- In focused edit/create mode, remove SSP top tabs and SSP-level context actions from the page body.
- Use explicit breadcrumb hierarchy for location and escape context.
- Use `BACK` as the secondary action (instead of `CANCEL`).
- Use a single contextual primary action (`SAVE ...` or `CREATE ...`) in the header action cluster.

### Current focused editor prototype set

Implementation cluster:

- `GVyJ6` - Edit User
- `xXlQe` - Create User
- `sz82E` - Edit Component
- `6Fxgw` - Create Component
- `8rj9D` - Edit Authorization
- `qzt33` - Create Authorization
- `ZCaQk` - Edit Overview

Controls cluster:

- `GmRZ5` - Edit Control Implementation
- `kcUBb` - Edit Requirement
- `JpgBg` - Create Requirement
- `F4yZl` - Edit Statement
- `iFWxz` - Create Statement
- `1VChN` - Edit By-Component
- `Km273` - Create By-Component

### Canvas organization update

- Replaced the old oversized scratch label with two Latte-consistent cluster headings:
  - `k19uR` - implementation focused editors heading
  - `qtWon` - controls focused editors heading

### Validation status

- Latest `pencil_snapshot_layout(..., problemsOnly=true)` result: `No layout problems`.

### SSP list parity pass (2026-03-01)

Added SSP-library/list screens so `/system-security-plans` list behavior is represented in Latte design artifacts:

- `MRRzf` - `App / System Security Plans / List / Latte`
  - Includes table-style rows with `VIEW`, `JSON`, and `SET` actions and an active-plan indicator.
- `WnWY8` - `App / System Security Plans / List / Loading / Latte`
- `4C6aJ` - `App / System Security Plans / List / Error / Latte`
- `rWalh` - `App / System Security Plans / List / Empty / Latte`

This pass intentionally stayed scoped to SSP pages only.

### SSP implementation states parity pass (2026-03-01)

Added missing implementation sub-tab state screens (loading/error/empty) for parity with current SSP implementation surfaces:

Users:

- `guPZ7` - `App / System Security Plans / Detail / Implementation / Users / Loading / Latte`
- `0CQ4i` - `App / System Security Plans / Detail / Implementation / Users / Error / Latte`
- `3f0ut` - `App / System Security Plans / Detail / Implementation / Users / Empty / Latte`

Components:

- `PY7Eb` - `App / System Security Plans / Detail / Implementation / Components / Loading / Latte`
- `aS9Xz` - `App / System Security Plans / Detail / Implementation / Components / Error / Latte`
- `BdGzo` - `App / System Security Plans / Detail / Implementation / Components / Empty / Latte`

Authorizations:

- `rkITp` - `App / System Security Plans / Detail / Implementation / Authorizations / Loading / Latte`
- `B2lar` - `App / System Security Plans / Detail / Implementation / Authorizations / Error / Latte`
- `qhM7P` - `App / System Security Plans / Detail / Implementation / Authorizations / Empty / Latte`

### Diagram action clarity update (2026-03-01)

To clarify behavior without adding a new flow, updated Characteristics diagram row action labels in `Q7gWr`:

- Replaced icon-only `Button/OpenPreview` with explicit `Button/OpenEditor` affordance (`EDIT` label + eye icon).
- This keeps the existing direct editing concept while making intent explicit in the design.

### Component dashboards parity prototypes (2026-03-01)

Added SSP-scoped dashboard/evidence-linking drawer prototypes in the Implementation / Components context:

- `vOztv` - `Prototype / System Security Plans / Detail / Implementation / Components / Dashboards Drawer (List) / Latte`
  - Linked dashboards list with `VIEW EVIDENCE` and `UNLINK` actions.
- `qBPCx` - `Prototype / System Security Plans / Detail / Implementation / Components / Dashboards Drawer (Link Existing) / Latte`
  - Existing dashboard selection + `LINK DASHBOARD` action.
- `g6xuv` - `Prototype / System Security Plans / Detail / Implementation / Components / Dashboards Drawer (Create New) / Latte`
  - New dashboard form pattern (name, baseline evidence, label conditions, generated filter).

### State card standardization pass (2026-03-01)

Standardized SSP state surfaces on the state-card pattern (instead of mixed inline-row vs card treatments), with consistent copy rules:

- Use `defined` language for user-authored entities (users/components/authorizations).
- Use `available` language for data/result/list states (compliance/json/ssp list).

Updated to state-card treatment:

- `lhWmx` - Compliance / Loading
- `Xqr5P` - Compliance / No Profile
- `nltDK` - Compliance / No Data
- `yB7qt` - Compliance / Error
- `wZAR6` - JSON / Loading
- `fbqHx` - JSON / Error

Copy alignment updates:

- `rWalh` list-empty message changed to `No system security plans available.`
- list-empty helper text changed to neutral guidance (verify data source + refresh).
- list-error helper text aligned to `Check API availability and retry.`

### State layout alignment pass (2026-03-01)

Adjusted state-card placement to follow regular top-down content flow (not vertically centered in the canvas region):

- Restored implementation state pages to the full implementation structure (sub-tabs + panel header + right rail), then swapped panel body content to state cards.
- Updated compliance/json state containers so cards render directly under the tab strip in normal content order.
