# IA Atlas (Sidebar-First)

This atlas documents the navigable application areas starting from the left sidebar, with two required states:

- Fresh / first-run state (no System Security Plan selected)
- Configured state (a System Security Plan selected in-session)

## Application Map (Sidebar-First)

### Global navigation (observed)

- Dashboards
- System
- Controls
- Workflow Definitions
- Workflow Instances
- Risk Register
- Inventory
- Evidence
- Logout

### Fresh / first-run state (no SSP selected)

- Dashboards: accessible; shows dashboard list and actions.
- System: gated; routes to an SSP-selection entry point ("SSP Page").
- Controls: gated; routes to an SSP-selection entry point ("SSP Page").
- Workflow Definitions: accessible; list + create + detail views.
- Workflow Instances: effectively empty/minimal UI.
- Risk Register: accessible; exposes POA&M entry point.
- Inventory: accessible; searchable/filterable inventory list.
- Evidence: accessible; query + results list + evidence detail.

### Configured state (SSP selected in-session)

- System: unlocks tabbed system workspace (Overview, System Users, System Components, Leveraged Authorizations).
- Controls: unlocks controls browser (search + control-family tree).
- Workflow Instances: unlocks list, filters, create entry point, and instance detail views.

## Route Drilldown Map (Key Flows)

### Dashboards

- Dashboards (list)

### System

- Fresh: System -> "SSP Page" (SSP selection list)
- Configured: System
- Configured: System -> System Users (tab)
- Configured: System -> System Components (tab)
- Configured: System -> Leveraged Authorizations (tab)

### Controls

- Fresh: Controls -> "SSP Page" (gating)
- Configured: Controls (search + control-family tree)

### Workflow Definitions

- Workflow Definitions (list)
- Workflow Definitions -> New Definition (create form)
- Workflow Definitions -> Definition detail
- Definition detail -> Overview / Steps / Controls / JSON (tabs)

### Workflow Instances

- Fresh: Workflow Instances (minimal / empty)
- Configured: Workflow Instances (list + filters)
- Workflow Instances -> Instance detail
- Instance detail -> Overview / Role Assignments / Executions / JSON (tabs)

### Risk Register

- Risk Register (module landing)
- Risk Register -> POA&M (list)
- POA&M list -> POA&M detail
- POA&M detail -> Overview / POAM Items / (other tabs present)

### Inventory

- Inventory (filters + inventory list)

### Evidence

- Evidence (query + results)
- Evidence -> Evidence detail

## Screenshot Index (Route/Module -> Filenames)

State labels used: `fresh`, `fresh-no-ssp`, `configured`, `ssp-set`, `validation-errors`, `pre-set`, `post-set-active`, `no-profile`.

### Global / Navigation

- Sidebar [fresh]: `desktop__ia-atlas__sidebar__fresh__01.png`
- Login [fresh]: `desktop__admin-implementation__auth-login__fresh__01.png`

### Home / Dashboards

- Home [fresh]: `desktop__dashboards-evidence__home__fresh__01.png`
- Home [configured]: `desktop__dashboards-evidence__home__configured__01.png`
- Dashboards (list) [fresh]: `desktop__ia-atlas__dashboards__fresh__01.png`, `desktop__dashboards-evidence__dashboards__fresh__01.png`
- Dashboards (list) [configured]: `desktop__dashboards-evidence__dashboards__configured__01.png`
- Create dashboard [fresh]: `desktop__dashboards-evidence__dashboards-create__fresh__01.png`, `desktop__dashboards-evidence__dashboards-create__fresh__02.png`

### SSP Selection / Switching

- SSP list (before setting active) [pre-set]: `desktop__system-inventory__ssp-list__pre-set__01.png`
- SSP list (after setting active) [post-set-active]: `desktop__system-inventory__ssp-list__post-set-active__01.png`
- SSP list (gating entry point) [fresh]: `desktop__dashboards-evidence__ssps__fresh__01.png`, `desktop__global-prereq-patterns__system-security-plans__fresh__01.png`, `desktop__workflows__system-security-plans__fresh__09.png`, `desktop__admin-implementation__system-security-plans__fresh__01.png`, `desktop__admin-implementation__system-security-plans__fresh__02.png`
- SSP list (working state) [configured]: `desktop__dashboards-evidence__ssps__configured__01.png`, `desktop__global-prereq-patterns__system-security-plans__configured__01.png`, `desktop__admin-implementation__system-security-plans__configured__01.png`, `desktop__admin-implementation__system-security-plans__configured__02.png`, `desktop__ia-atlas__system-security-plans__configured__01.png`
- SSP list (working state) [ssp-set]: `desktop__workflows__system-security-plans__ssp__10.png`
- Switch SSP in-session [configured]: `desktop__controls__system-security-plans__configured-ssp-switch__03.png`
- SSP set confirmation [ssp-set]: `desktop__controls__system-security-plans__configured-ssp-set__01.png`, `desktop__controls__system-security-plans__configured-ssp-set__02.png`

### System

- System landing (gated) [fresh]: `desktop__ia-atlas__system__fresh__01.png`
- System landing (gated) [fresh-no-ssp]: `desktop__system-inventory__system-overview__fresh-no-ssp__01.png`, `desktop__global-prereq-patterns__system__fresh__01.png`
- System Overview [configured]: `desktop__ia-atlas__system__configured__01.png`, `desktop__global-prereq-patterns__system__configured__01.png`, `desktop__global-prereq-patterns__system__configured__02.png`
- System Overview [ssp-set]: `desktop__system-inventory__system-overview__ssp-set__01.png`
- System Users (tab/list) [configured]: `desktop__ia-atlas__system-users__configured__01.png`
- System Users (gated) [fresh-no-ssp]: `desktop__system-inventory__system-users__fresh-no-ssp__01.png`
- System Users (tab/list) [ssp-set]: `desktop__system-inventory__system-users__ssp-set__01.png`
- Create System User [ssp-set]: `desktop__system-inventory__system-users-create__ssp-set__01.png`
- Create System User (validation) [validation-errors]: `desktop__system-inventory__system-users-create__validation-errors__01.png`
- System Components (tab/list) [configured]: `desktop__ia-atlas__system-components__configured__01.png`
- System Components (gated) [fresh-no-ssp]: `desktop__system-inventory__system-components__fresh-no-ssp__01.png`
- System Components (tab/list) [ssp-set]: `desktop__system-inventory__system-components__ssp-set__01.png`
- Create System Component [ssp-set]: `desktop__system-inventory__system-components-create__ssp-set__01.png`
- Create System Component (validation) [validation-errors]: `desktop__system-inventory__system-components-create__validation-errors__01.png`
- Leveraged Authorizations (tab) [configured]: `desktop__ia-atlas__system-leveraged-authorizations__configured__01.png`
- Leveraged Authorizations (gated) [fresh-no-ssp]: `desktop__system-inventory__system-authorizations__fresh-no-ssp__01.png`
- Leveraged Authorizations (tab/list) [ssp-set]: `desktop__system-inventory__system-authorizations__ssp-set__01.png`
- Create Leveraged Authorization [ssp-set]: `desktop__system-inventory__system-authorizations-create__ssp-set__01.png`

### Controls

- Controls landing (gated) [fresh]: `desktop__ia-atlas__controls__fresh__01.png`
- Controls landing (gated) [fresh-no-ssp]: `desktop__controls__controls__fresh-no-ssp__01.png`, `desktop__global-prereq-patterns__controls__fresh__01.png`
- Controls landing [configured]: `desktop__ia-atlas__controls__configured__01.png`, `desktop__controls__controls__configured__01.png`, `desktop__global-prereq-patterns__controls__configured__01.png`
- Controls tree (baseline) [configured]: `desktop__controls__controls-tree__configured__02.png`, `desktop__controls__controls-tree__configured__04.png`, `desktop__controls__controls-tree__configured__05.png`
- Controls tree (keyboard) [configured]: `desktop__controls__controls-tree__configured-keyboard__09.png`
- Controls tree (collapsed) [configured]: `desktop__controls__controls-tree__configured-collapsed__19.png`
- Controls tree (expanded) [configured]: `desktop__controls__controls-tree__configured-expanded__18.png`, `desktop__controls__controls-tree__configured-expanded__20.png`
- Control list interactions (row click) [configured]: `desktop__controls__controls__configured-rowclick__06.png`
- Search (results) [configured]: `desktop__controls__controls__configured-search__07.png`
- Search (empty results) [configured]: `desktop__controls__controls__configured-empty-search__08.png`
- Control details drawer (entry) [configured]: `desktop__controls__controls__configured-drawer__03.png`, `desktop__controls__controls__configured-eye-click__15.png`
- Control details drawer (states) [configured]: `desktop__controls__controls-drawer__configured__10.png`, `desktop__controls__controls-drawer__configured__11.png`, `desktop__controls__controls-drawer__configured__12.png`, `desktop__controls__controls-drawer__configured__13.png`, `desktop__controls__controls-drawer__configured__14.png`
- Eye icon (no details available) [configured]: `desktop__controls__controls__configured-eye-no-details__17.png`
- Control action flow [configured]: `desktop__controls__controls__configured-control-action__21.png`
- Secondary gate (no profile) [no-profile]: `desktop__controls__controls__configured-no-profile__22.png`

### Workflow Definitions

- Workflow Definitions (list) [fresh]: `desktop__ia-atlas__workflow-definitions__fresh__01.png`, `desktop__workflows__workflows__fresh__01.png`
- Workflow Definitions (list) [ssp-set]: `desktop__workflows__workflows__ssp__22.png`
- Workflow Definition create (page) [fresh]: `desktop__ia-atlas__workflow-definitions-create__fresh__01.png`
- New definition dialog [fresh]: `desktop__workflows__new-definition-dialog__fresh__02.png`
- New definition (validation) [validation-errors]: `desktop__workflows__new-definition-validation__fresh__03.png`
- Definition detail (entry) [fresh]: `desktop__ia-atlas__workflow-definition-detail__fresh__01.png`
- Definition detail: Overview tab [fresh]: `desktop__workflows__workflow-definition-overview__fresh__04.png`
- Definition detail: Steps tab [fresh]: `desktop__ia-atlas__workflow-definition-steps__fresh__01.png`, `desktop__workflows__workflow-definition-steps__fresh__05.png`
- Definition detail: Controls tab [fresh]: `desktop__ia-atlas__workflow-definition-controls__fresh__01.png`, `desktop__workflows__workflow-definition-controls__fresh__06.png`
- Definition detail: JSON tab [fresh]: `desktop__ia-atlas__workflow-definition-json__fresh__01.png`, `desktop__workflows__workflow-definition-json__fresh__07.png`

### Workflow Instances

- Workflow Instances (minimal/empty) [fresh]: `desktop__ia-atlas__workflow-instances__fresh__01.png`, `desktop__workflows__workflow-instances__fresh__08.png`, `desktop__global-prereq-patterns__workflow-instances__fresh__01.png`
- Workflow Instances (list) [configured]: `desktop__ia-atlas__workflow-instances__configured__01.png`, `desktop__global-prereq-patterns__workflow-instances__configured__01.png`
- Workflow Instances (list) [ssp-set]: `desktop__workflows__workflow-instances__ssp__11.png`, `desktop__workflows__workflow-instances__ssp__19.png`
- New instance dialog [ssp-set]: `desktop__workflows__new-instance-dialog__ssp__20.png`
- New instance (validation) [validation-errors]: `desktop__workflows__new-instance-validation__ssp__21.png`
- Instance detail (entry) [configured]: `desktop__ia-atlas__workflow-instance-detail__configured__01.png`
- Instance detail (overview) [ssp-set]: `desktop__workflows__workflow-instance-detail__ssp__12.png`
- Role assignments tab [ssp-set]: `desktop__workflows__workflow-instance-role-assignments__ssp__13.png`
- Executions tab [configured]: `desktop__ia-atlas__workflow-instance-executions__configured__01.png`
- Executions tab [ssp-set]: `desktop__workflows__workflow-instance-executions__ssp__14.png`
- Execution detail [ssp-set]: `desktop__workflows__workflow-execution-detail__ssp__15.png`
- Execution details dialog [ssp-set]: `desktop__workflows__workflow-execution-details-dialog__ssp__16.png`
- Instance JSON tab [ssp-set]: `desktop__workflows__workflow-instance-json__ssp__17.png`
- Execute now dialog [ssp-set]: `desktop__workflows__execute-now-dialog__ssp__18.png`

### Risk Register / POA&M

- Risk Register landing [fresh]: `desktop__ia-atlas__risk-register__fresh__01.png`
- POA&M list [fresh]: `desktop__ia-atlas__poam-list__fresh__01.png`, `desktop__global-prereq-patterns__poam__fresh__01.png`, `desktop__global-prereq-patterns__poam__fresh__02.png`
- POA&M list [configured]: `desktop__global-prereq-patterns__poam__configured__01.png`
- POA&M detail: Overview [fresh]: `desktop__ia-atlas__poam-detail-overview__fresh__01.png`
- POA&M detail: Items [fresh]: `desktop__ia-atlas__poam-detail-items__fresh__01.png`

### Inventory

- Inventory module (entry) [fresh]: `desktop__ia-atlas__inventory__fresh__01.png`, `desktop__system-inventory__inventory-index__fresh__01.png`
- Inventory item detail [fresh]: `desktop__system-inventory__inventory-item__fresh__01.png`
- Inventory empty state [fresh]: `desktop__system-inventory__inventory-index__fresh-empty__01.png`
- Inventory filters (type dropdown) [fresh]: `desktop__system-inventory__inventory-filters__fresh-type-dropdown__01.png`
- Inventory filters (refresh/uncheck) [fresh]: `desktop__system-inventory__inventory-index__fresh-filters-unchecked-refresh__01.png`
- Inventory filter example (firewall) [fresh]: `desktop__system-inventory__inventory-index__fresh-filter-firewall__01.png`
- Inventory filter example (firewall + SSP checked) [fresh]: `desktop__system-inventory__inventory-index__fresh-filter-firewall-ssp-checked__01.png`
- Inventory filter example (firewall + SSP unchecked) [fresh]: `desktop__system-inventory__inventory-index__fresh-filter-firewall-ssp-unchecked__01.png`
- Inventory index (SSP applied) [ssp-set]: `desktop__system-inventory__inventory-index__ssp-set__01.png`

### Evidence

- Evidence list/search [fresh]: `desktop__ia-atlas__evidence__fresh__01.png`, `desktop__dashboards-evidence__evidence__fresh__01.png`
- Evidence list/search [configured]: `desktop__dashboards-evidence__evidence__configured__01.png`
- Evidence detail [fresh]: `desktop__ia-atlas__evidence-detail__fresh__01.png`, `desktop__dashboards-evidence__evidence-detail__fresh__01.png`
- Evidence detail (by ID) [fresh]: `desktop__dashboards-evidence__evidence-id__fresh__01.png`
- Create evidence [fresh]: `desktop__dashboards-evidence__evidence-create__fresh__01.png`
- Create evidence [configured]: `desktop__dashboards-evidence__evidence-create__configured__01.png`
- Update evidence [fresh]: `desktop__dashboards-evidence__evidence-update__fresh__01.png`, `desktop__dashboards-evidence__evidence-update__fresh__02.png`
- Evidence history [fresh]: `desktop__dashboards-evidence__evidence-history__fresh__01.png`

### Assessment Plans / Assessment Results

- Assessment Plans (gated examples) [fresh]: `desktop__global-prereq-patterns__assessment-plans__fresh__01.png`, `desktop__global-prereq-patterns__assessment-plans__fresh__02.png`, `desktop__global-prereq-patterns__assessment-plans__fresh__03.png`
- Assessment Plans (working state) [configured]: `desktop__global-prereq-patterns__assessment-plans__configured__01.png`
- Assessment Results (gated examples) [fresh]: `desktop__global-prereq-patterns__assessment-results__fresh__01.png`, `desktop__global-prereq-patterns__assessment-results__fresh__02.png`
- Assessment Results (working state) [configured]: `desktop__global-prereq-patterns__assessment-results__configured__01.png`

### Admin / Implementation (Deep Links Observed)

- Admin home [fresh]: `desktop__admin-implementation__home__fresh__01.png`
- Admin home [configured]: `desktop__admin-implementation__home__configured__01.png`
- Admin import [fresh]: `desktop__admin-implementation__admin-import__fresh__01.png`
- Admin import [configured]: `desktop__admin-implementation__admin-import__configured__01.png`
- Catalogs [fresh]: `desktop__admin-implementation__catalogs__fresh__01.png`
- Catalogs [configured]: `desktop__admin-implementation__catalogs__configured__01.png`
- Catalog detail [configured]: `desktop__admin-implementation__catalogs-detail__configured__01.png`
- Profiles [fresh]: `desktop__admin-implementation__profiles__fresh__01.png`
- Profile detail [fresh]: `desktop__admin-implementation__profiles-detail__fresh__01.png`
- Profile detail (JSON) [fresh]: `desktop__admin-implementation__profiles-detail-json__fresh__01.png`
- Component definitions [fresh]: `desktop__admin-implementation__component-definitions__fresh__01.png`
- Component definition detail [fresh]: `desktop__admin-implementation__component-definitions-detail__fresh__01.png`
- Component definition detail (JSON) [fresh]: `desktop__admin-implementation__component-definitions-detail-json__fresh__01.png`
- Parties [fresh]: `desktop__admin-implementation__parties__fresh__01.png`
- Roles [fresh]: `desktop__admin-implementation__roles__fresh__01.png`
- Users [fresh]: `desktop__admin-implementation__users__fresh__01.png`
- Users [configured]: `desktop__admin-implementation__users__configured__01.png`
- User detail [configured]: `desktop__admin-implementation__users-detail__configured__01.png`
- SSP detail [configured]: `desktop__admin-implementation__system-security-plans-detail__configured__01.png`
- SSP detail (JSON) [configured]: `desktop__admin-implementation__system-security-plans-detail-json__configured__01.png`
- Assessment Plans [fresh]: `desktop__admin-implementation__assessment-plans__fresh__01.png`
- Assessment Plans [configured]: `desktop__admin-implementation__assessment-plans__configured__01.png`
- Assessment Plan detail [configured]: `desktop__admin-implementation__assessment-plans-detail__configured__01.png`
- Assessment Plan detail (JSON) [configured]: `desktop__admin-implementation__assessment-plans-detail-json__configured__01.png`
- Assessment Results [fresh]: `desktop__admin-implementation__assessment-results__fresh__01.png`
- Assessment Results [configured]: `desktop__admin-implementation__assessment-results__configured__01.png`
- Assessment Result detail [configured]: `desktop__admin-implementation__assessment-results-detail__configured__01.png`
- Assessment Result detail (JSON) [configured]: `desktop__admin-implementation__assessment-results-detail-json__configured__01.png`
- Plan of Action & Milestones [fresh]: `desktop__admin-implementation__plan-of-action-and-milestones__fresh__01.png`
- Plan of Action & Milestones [configured]: `desktop__admin-implementation__plan-of-action-and-milestones__configured__01.png`
- POA&M detail [configured]: `desktop__admin-implementation__plan-of-action-and-milestones-detail__configured__01.png`
- POA&M detail (JSON) [configured]: `desktop__admin-implementation__plan-of-action-and-milestones-detail-json__configured__01.png`

## Key States Captured

- Gated vs configured: multiple modules shown before/after selecting an SSP, including the SSP list screens.
- SSP activation/selection prerequisite: screenshots include pre-set vs post-set-active, plus in-session switching.
- Secondary gate: Controls includes a `no-profile` example even after SSP selection.
- Validation errors: System Users and System Components create flows; new workflow definition and new instance flows.
- Empty states: Inventory empty list and Workflow Instances minimal/empty.

## Prerequisite Gating Discoverability Notes

- SSP activation/selection prerequisite is a primary prerequisite: without selecting (and effectively activating) an SSP, key modules (notably System and Controls) route to a single SSP entry point and do not reveal their normal sub-navigation.
- Unlock moment is not strongly self-evident from the gated pages: the gating UI presents a generic "SSP Page" link rather than a clearer call-to-action like "Select a System Security Plan to continue".
- Multiple areas use a similar "Set" concept (e.g., SSP list, POA&M list), which can create ambiguity about what is being set (active context vs. default vs. current working document).
