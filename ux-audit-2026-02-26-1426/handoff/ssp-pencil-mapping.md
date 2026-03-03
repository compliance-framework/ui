Pencil: SSP Frames Identified

- Active design file: ui/ux-audit-2026-02-26-1426/new-design.pen
- Edit/Create frames (the ones you likely want “somewhere else”):
  - vmTna App / System Security Plans / Detail / Implementation / Overview / Editing / Latte
  - Controls editors: 1VChN, kcUBb, JpgBg, F4yZl, iFWxz, GmRZ5, Km273
  - Implementation editors: GVyJ6, xXlQe, sz82E, 6Fxgw, 8rj9D, qzt33, ZCaQk
  - Dashboards/evidence drawer prototypes: vOztv, qBPCx, g6xuv
- Full SSP top-level frame inventory (App + Prototype):
  - List: MRRzf, WnWY8, 4C6aJ, rWalh
  - Detail / Overview (+states): fC9h5, zB9eT, tyWSH, WNbFS, iuqz3
  - Detail / Characteristics: Q7gWr
  - Detail / Implementation: MksAD, RLAx1, W1WOY, YcMfm, vmTna, guPZ7, 0CQ4i, 3f0ut, PY7Eb, aS9Xz, BdGzo, rkITp, B2lar, qhM7P
  - Detail / Controls (+states): oSoOH, hY9bO, ZYyJ2, DXM45, cNhnM
  - Detail / Compliance (+states): eo4Hs, lhWmx, Xqr5P, nltDK, yB7qt
  - Detail / JSON (+states): DUJ4o, wZAR6, fbqHx
  - Prototype editors: 1VChN, kcUBb, JpgBg, F4yZl, iFWxz, GmRZ5, Km273, GVyJ6, xXlQe, sz82E, 6Fxgw, 8rj9D, qzt33, ZCaQk, vOztv, qBPCx, g6xuv
    UI Page ↔ Pencil Frame Mapping (Current Implementation)
- Router: ui/src/router/index.ts (Vue 3 + vue-router)
- /system-security-plans -> ui/src/views/system-security-plans/SystemSecurityPlanListView.vue -> MRRzf (+ WnWY8, 4C6aJ, rWalh)
- /system-security-plans/:id shell -> ui/src/views/system-security-plans/SystemSecurityPlanEditorView.vue -> corresponds to the whole App / System Security Plans / Detail / ... set
- Overview tab (/system-security-plans/:id) -> ui/src/views/system-security-plans/SystemSecurityPlanOverviewView.vue -> fC9h5 (+ tyWSH, WNbFS, zB9eT, iuqz3)
- System Characteristics (/system-security-plans/:id/system-characteristics) -> ui/src/views/system-security-plans/SystemSecurityPlanCharacteristicsView.vue -> Q7gWr
- System Implementation (/system-security-plans/:id/system-implementation) -> ui/src/views/system-security-plans/SystemSecurityPlanSystemImplementationEditorView.vue -> MksAD, RLAx1, W1WOY, YcMfm (+ their loading/error/empty frames)
- Control Implementation (/system-security-plans/:id/control-implementation) -> ui/src/views/system-security-plans/SystemSecurityPlanControlImplementationView.vue -> oSoOH (+ cNhnM, hY9bO, ZYyJ2, DXM45)
- Compliance (/system-security-plans/:id/compliance) -> ui/src/views/system-security-plans/SystemSecurityPlanComplianceView.vue -> eo4Hs (+ lhWmx, Xqr5P, nltDK, yB7qt)
- JSON (/system-security-plans/:id/json) -> ui/src/views/system-security-plans/SystemSecurityPlanJSONView.vue -> DUJ4o (+ wZAR6, fbqHx)
- Edit/Create flows in UI are dialogs/in-place forms (not separate routes) and match the Prototype / ... frames:
  - Implementation Overview in-place edit: ui/src/components/system-security-plans/SystemImplementationOverviewForm.vue -> vmTna and/or ZCaQk
  - Users: SystemImplementationUserCreateForm.vue / SystemImplementationUserEditForm.vue -> xXlQe / GVyJ6
  - Components: SystemImplementationComponentCreateForm.vue / SystemImplementationComponentEditForm.vue -> 6Fxgw / sz82E
  - Leveraged Authorizations: SystemImplementationLeveragedAuthorizationCreateForm.vue / ...EditForm.vue -> qzt33 / 8rj9D
  - Controls: ImplementedRequirementCreateForm.vue / ...EditForm.vue / StatementCreateForm.vue / StatementEditForm.vue / ByComponentEditForm.vue / ControlImplementationEditForm.vue -> JpgBg, kcUBb, iFWxz, F4yZl, 1VChN, GmRZ5
    API Endpoints (Backing Those UI Pages)
- SSP base: /api/oscal/system-security-plans in api/internal/api/handler/oscal/system_security_plans.go
  - List/detail CRUD: GET/POST /, GET/PUT/DELETE /{id}, plus GET /{id}/full
  - Metadata: GET/PUT /{id}/metadata
  - Profile attach: GET /{id}/profile, PUT /{id}/profile
  - Characteristics: GET/PUT /{id}/system-characteristics (+ diagram subroutes)
  - System implementation: GET/PUT /{id}/system-implementation (+ users/components/inventory-items/leveraged-authorizations CRUD)
  - Control implementation: GET/PUT /{id}/control-implementation (+ implemented-requirements, statements, by-components CRUD)
- Compliance is profile-driven (not SSP-prefixed): GET /api/oscal/profiles/{id}/compliance-progress?sspId=...
  Plan To De-Clutter Pencil (No edits done yet)
- Recommended: create a new top-level container like SSP / Editors (Create+Edit) and move these frames under it so the left panel becomes collapsible:
  - Move: vmTna, 1VChN, kcUBb, JpgBg, F4yZl, iFWxz, GmRZ5, Km273, GVyJ6, xXlQe, sz82E, 6Fxgw, 8rj9D, qzt33, ZCaQk, vOztv, qBPCx, g6xuv
- Alternative: extract those editors into a separate .pen file (more declutter, but we’d need to ensure all referenced components/styles come along cleanly).
