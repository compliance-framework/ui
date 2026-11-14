# V1 / V2 desktop browser audit

## Summary

V2 is a deliberate UX redesign. This audit evaluates whether users can complete the intended task with correct data and clear feedback. Consolidated sections and alternative workflows count as supported capabilities. Missing V1 buttons or repeated panels alone do not establish a defect.

The real-browser pass covers every scoped desktop surface and representative create/edit/delete, keyboard, reload and history workflows. Both UIs use the same local API and seeded fixtures. All screenshots in this report are **light mode at 1440 × 900**. Mobile checks are excluded. This is a report-only audit: no application fixes, backlog changes, commits or pushes.

V1: origin/main `e5f9837`, localhost:3001. V2: `feat/BCH-1174-ux-resume`, HEAD `d1571c8d6885bf012fd097fea8610651c4da84a9`, localhost:3000. API: localhost:8080. Role: local admin. Writes use disposable remapped SSP copies, their child objects and two disposable filters. Enterprise, FedRAMP and GoodRead originals are read-only.

### Design authority and scope

- [PRD §4.5](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/ui-v2-migration-prd.md:66): explicit owner decisions govern theme location, Evidence landing, SSP tab consolidation, immediate logout and safe destructive confirmation.
- [Approved execution decisions](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/execution-log.md:53): diagram editing uses one save action and compact controls; properties/links are managed through Edit mode; read-mode content is designed for scanning.
- [SSP unification](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/handoff/ssp-detail-pages-unification-handoff.md:359): canonical SSP detail owns the shared workflow; active-system navigation serves as a shortcut. The alias is a proposed direction, not proof that every runtime route is complete.
- [Controls decisions](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/handoff/controls-functional-tree-handoff.md:151): no Expand All/Collapse toolbar, evidence chips, explicit no-statement handling and task-specific OPEN/IMPLEMENT actions.
- [auth layout spec](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/handoff/login-process-handoff.md:68): the guest shell is deliberately redesigned, with action-level errors and Docs/Support links. PRD §4.5.5 specifies immediate logout; the handoff's confirmation proposal does not apply.
- [Pencil design](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/new-design.pen): inspected frame text/structure for fC9h5 (SSP overview), Q7gWr (Characteristics), MksAD (Implementation), rCe93 (filters) and UN1KO (guest login). These frames establish presentation, not approval to discard every unrepresented business field.
- [Dashboard handoff](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/handoff/dashboard-redesign-handoff.md:19): proposes a workspace landing and a single activation path. PRD §4.5.2 governs the landing route. Its no-duplicate-action principle supports reviewing task ownership rather than counting buttons.
- [design policy](/Volumes/Vault/repos/ccf/ui-remake/ux-audit-2026-02-26-1426/migration-governance.md:23): Pencil and logged deviations govern presentation; the current backlog explicitly retains filtering, reusable definitions, component-context risks and suggestions. Proposed handoff content and unresolved backlog items require an intent check, not automatic acceptance as approved decisions.

### Findings by user impact

1. **Logout leaves an accepted API session (NEW-04, main-origin).** Both UIs show sign-in while users/me returns 200. V2 logout POST returns 404.
2. **Enter deletes a component (M3-12).** V2 focuses Confirm and Enter returns DELETE 204. PRD §4.5.6 requires Cancel focus and Enter/Escape cancellation.
3. **GoodRead JSON fails (NEW-03, main-origin).** Both UIs receive 500 from the seeded SSP full-document endpoint.
4. **Moderate profile attachment fails (NEW-07, main-origin).** Both UIs receive 500 resolving the profile's imported catalog; Low attach/remove works.
5. **Evidence-filter scope selection is unavailable (M4-02).** V1 narrows FedRAMP to two filters; V2 shows all seven. SSP/control/component filtering remains an explicit task.
6. **Reusable component selection is unavailable (M1-15).** V1 definition selection supplies templates; V2 supplies manual creation only.
7. **Requirement query and displayed detail disagree (NEW-06).** V2 retains a target controlId URL while displaying AC-1.
8. **Session expiry produces duplicate feedback (NEW-05; M3-06).** V1 shows three identical errors; V2 shows four plus a profile-loading error. Both lose return context.
9. **Component-context risk discovery requires extra navigation (M1-07).** Risk creation and component association work through Risks in both UIs. The V2 component card has no local risk context; the business capability is supported.
10. **Bulk suggestion affordance lacks V2 ownership (M1-03).** V1 exposes Apply All Suggestions. AI execution is unverified because the local flag is disabled.

### Verdicts and evidence

PARITY means the tested task succeeds in both UIs. IMPROVED means a tested behavior adds clarity or integrity. INTENTIONAL is backed by an owner decision or approved execution record. MISSING identifies an explicitly retained task unavailable on the tested surface, without prescribing a V1 layout. DEGRADED describes observable inconsistency, feedback or discovery friction. BROKEN identifies a failed supported task. UNVERIFIED states a runtime or design-contract limit.

Only `full-*` captures from this desktop light pass support the runtime findings below. Screenshots show UI state; request/state logs capture methods, status codes, payloads and bounded browser snapshots. Authentication payloads are redacted. OPTIONS 204 is preflight, not deletion. Selector failures, malformed automation inputs, oversized recorder output and stale duplicate-attach attempts are harness failures and excluded from product findings. A URL retained by history does not prove that its selected content is restored.

| Verdict | Inventory rows |
| --- | ---: |
| BROKEN | 4 |
| DEGRADED | 4 |
| IMPROVED | 8 |
| INTENTIONAL | 9 |
| MISSING | 4 |
| PARITY | 26 |
| UNVERIFIED | 8 |

Counts describe inventory rows, not distinct defects. Shared V1/V2 failures are main-origin findings.



## Sign-in — /login and /auth/login

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Guest form and configured providers | Email/password, recovery, Google and GitHub. | Same authentication choices in the guest shell. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-guest-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-guest-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-guest.json) | NEW |
| 2 | Successful login | POST 200; Evidence landing. | POST 200; Evidence landing. | PARITY | [login requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-login-recorded.json) | M0-11 |
| 3 | Blank and invalid login | Blank POST 401; invalid credentials 401 with toast. | Blank fields prevent POST; invalid credentials 401 with inline banner. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-validation-2.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-validation-4.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-validation.json) · [V1 blank](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-validation-1.jpg) · [V2 blank](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-validation-3.jpg) | M3-06 |

## Recovery — /forgot-password and /auth/forgot-password

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | Blank recovery | Blank email request returns 200. | Required email validation prevents request. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-recovery-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-recovery-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-recovery.json) | NEW |

## Password reset — /password-reset and /auth/password-reset

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Missing/bogus reset token | Reset form remains available. | Invalid-link state hides the form. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-reset-2.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-reset-4.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-reset.json) · [V1 missing](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-reset-1.jpg) · [V2 missing](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-reset-3.jpg) | NEW |

## SSO callback

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | SSO callback without valid authorization | Failure returns to login. | Failure returns to login. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-sso-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-sso-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-sso.json) | NEW |

## Logout — /logout and /auth/logout

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | Immediate logout | Returns to sign-in. | Returns to sign-in without confirmation, as specified. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout.json) | PRD §4.5.5 |
| 8 | Server session after logout | users/me still returns 200. | Logout POST 404; users/me still returns 200. | BROKEN | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout.json) | NEW-04; main-origin |

## App shell

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | Expired-session feedback | Three identical authentication-error toasts after concurrent 401s. | Four identical authentication-error toasts plus profile-loading error. | DEGRADED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry.json) | NEW-05; main-origin |
| 10 | Expiry return context | Login redirect lacks next/session_expired. | Login redirect lacks next/session_expired. | DEGRADED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry.json) | M3-06; main-origin |
| 11 | Navigation and user menu | Navigation destinations and account actions visible. | 18 destination links; numbered static headings; account actions and theme choice in menu. Destination inventory does not validate every retained page. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-menu-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-menu-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-menu.json) | PRD §4.5.1; execution log |
| 12 | Desktop history and settled layout | Library/filter/tab URLs survive tested reload and Back/Forward. | Library/filter/tab and Implementation section URLs survive tested reload and Back/Forward; 1440 px light layout. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library.json) · [filter/create history](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-desktop-history-filters-create.json) · [compliance/JSON history](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-desktop-history-compliance-json.json) · [controls/system history](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-desktop-history-controls-system.json) | NEW |

## Evidence filters — /dashboards and /dashboards/:id

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | List data and edit access | Shared filter data loads 200; edit accessible. | Same shared filter data loads 200; edit accessible. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory.json) | M4-02 |
| 14 | SSP scoped list filtering | FedRAMP selection narrows list to two AWS filters. | List remains seven filters, including two disposable records; equivalent SSP narrowing unavailable. | MISSING | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof.json) | M4-02 |
| 15 | Control/component list filtering | Scope selectors present. | Equivalent list narrowing controls unavailable on tested surface. | MISSING | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-scope-proof.json) | M4-02 |
| 16 | Filter create | Retained create form; POST 201. | Retained create form; POST 201 with corresponding fields. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create-form-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create-form-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create-form.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-create.json) | NEW |
| 17 | Filter edit persistence | Disposable filter PUT 200. | Disposable filter PUT 200 through shared editor. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-edit-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-edit-v2-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-edit.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-edit-v2.json) | NEW |
| 18 | Filter ID URL | ID URL renders the list. | ID URL renders the list, matching logged route decision. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-detail-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-detail-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filter-detail.json) | execution log:66 |
| 19 | Charts and result requests | Requests/display observed. | Requests/display observed; exact numerical/time-window equivalence not reconciled. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-filters-inventory.json) | M4-02 |

## SSP library — /system-security-plans

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | Library identity/actions | Titles, profiles and View/Set Active actions available. | Titles, profiles and View/Set actions available. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-shell-library.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-active-enterprise-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-active-enterprise-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-active-enterprise.json) | NEW |

## SSP creation — /system-security-plans/create

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 21 | Create SSP | Minimal metadata POST 201. | POST 201 supplies full initial OSCAL structure and defaults. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-v2-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-v2.json) | M1-18 |
| 22 | Manual identifier authoring | Manual UUID control available. | Generated identifier; no manual UUID control. Required V2 contract unresolved. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-v2-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-ssp-create-v2.json) | M1-18 |

## SSP editor shell and profiles

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 23 | Editor information architecture | Detail routes with separate child destinations. | Seven tabs; Users/Components/Authorizations belong to Implementation sections. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components-3.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components.json) | PRD §4.5.4 |
| 24 | Child route reachability | Implementation child pages reachable. | Child URLs redirect to their corresponding Implementation sections. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components-2.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components-4.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-components.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-3.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control.json) | PRD §4.5.4 |
| 25 | Hidden business URLs | Risks/export/leverage/inherited URLs reachable. | Corresponding retained URLs load; business logic beyond alternative-workflow checks is outside scope. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability.json) | PRD §4.5.4 |
| 26 | Low profile attach/remove | POST 200 and binding DELETE 200. | POST 200 and binding DELETE 200. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-v1-roundtrip-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-v2-roundtrip-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-v1-roundtrip.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-v2-roundtrip.json) | M1-06 |
| 27 | Moderate profile attach | Low attaches 200; Moderate fails 500 resolving imported catalog. | Same Low 200 and Moderate 500. Multiple-binding switching cannot be verified with this fixture. | BROKEN | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-multiple-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-multiple-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-multiple.json) | NEW-07; main-origin |

## SSP Overview

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 28 | Identity and totals | Seeded identity and summary data. | Compact identity and totals; summary/risk/compliance information. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview.json) | NEW |
| 29 | Metadata editing and repeated destinations | Overview exposes metadata/editor and repeated detail actions. | Compact overview; dedicated Compliance/JSON tabs own those tasks; no metadata editor is specified. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview.json) | PRD §4.5.3–4 |
| 30 | Metadata remarks visibility | Remarks visible in overview. | Compact overview omits remarks; no data loss observed; read-mode ownership unresolved. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-overview.json) | M1-18; fC9h5 |

## SSP Characteristics

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 31 | Characteristics fields/Edit | Characteristics data and editor available. | Characteristics data and Edit flow available. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics.json) | NEW |
| 32 | OSCAL payload key conversion | Nested camelCase keys occur in recorded save payload. | Nested OSCAL keys are kebab-case; PUT 200 on disposable copy. General preservation of every nested field is not established. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-save-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-save-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-save.json) · [isolated V2 save](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-v2-fair-save.json) | M2-07 |
| 33 | Architecture narratives | Seeded FedRAMP shows three architecture narrative fields. | Diagram-focused surface omits these fields; narrative ownership lacks explicit decision. Diagram descriptions are separate API sections. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-fedramp-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-fedramp-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-characteristics-fedramp.json) | M1-01; Q7gWr |
| 34 | Diagram create and editor entry | Overview Add Diagram creates 201 and opens embedded DrawIO. | Characteristics Add Diagram creates 201 and opens drawer DrawIO. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-v1-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-dialog-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-v1-create.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-dialog.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-editor-paired-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-editor-paired-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-editor-paired.json) | M1-01 |
| 35 | Diagram save/export | Blank-canvas export PUT 200 with PNG/XML properties. | Single Save PUT 200; caption/description and PNG/XML properties persist. Blank 1×1 PNG is expected for empty canvas. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-save-paired-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-save-paired-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-diagram-save-paired.json) | approved execution decisions:53–65 |

## SSP Implementation — overview

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 36 | Implementation overview editor | Description/remarks/props/links editor PUT 200. | Editor PUT 200 with nested users/components and corresponding fields. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-save-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-save-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-save.json) | NEW |

## Implementation Users

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 37 | Users data and creation | Seeded users/roles visible; disposable user POST 201. | Same users/roles; disposable user POST 201. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-form-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-form-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-form.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-create-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-users-create.json) | NEW |
| 38 | User edit | Disposable user PUT 200. | Disposable user PUT 200. Populated privileges/exports round-trip not exercised. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-user-editor-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-editors-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-user-editor.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-editors.json) | NEW |

## Implementation Components

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 39 | Component creation | Disposable component POST 201 with manual fields/defaults. | Disposable component POST 201 with corresponding fields/defaults. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-form-complete-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-form-complete-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-form-complete.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-create-recorded-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-create-recorded-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-components-create-recorded.json) | NEW |
| 40 | Reusable definition/template selection | Definition picker offers three definitions; Amazon selection GET 200 provides defined component templates. | Manual creation form; equivalent reuse flow unavailable. | MISSING | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-template-reuse-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-template-reuse-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-template-reuse.json) · [definition selection](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-template-select-v1.json) | M1-15 |
| 41 | Component edit | PUT 200 after explicit Save. | PUT 200 after explicit Save. | PARITY | [V1 form](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-edit-delete-1.jpg) · [V2 form](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-edit-delete-2.jpg) · [V1 save](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-component-save.json) · [V2 save](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-edit-delete.json) | NEW |
| 42 | Destructive Enter | Focused close control; Enter cancels with no DELETE. | Confirm receives focus; Enter deletes disposable component with 204. Footer advertises Enter confirmation, conflicting with required Cancel behavior. | BROKEN | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-component-save-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-edit-delete-3.jpg) · [V1 keyboard](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-component-save.json) · [V2 keyboard](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-edit-delete.json) | M3-12; PRD §4.5.6 |
| 43 | Destructive Escape | Escape cancels, no DELETE. | Escape cancels, no DELETE. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-destructive-escape-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-destructive-escape-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-destructive-escape.json) | M3-12 |
| 44 | Component risk association task | Risks create 201; detail Components picker links component 201, readback 200. | Same task completes through Risks → detail → Components → Add Component; link 201, readback 200. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v1-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v2-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v1.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v2.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-create-submit-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-create-submit-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-create-submit.json) | M1-07 |
| 45 | Risk discovery from component | Component-context risk list and create action present. | Card omits local risk context; user must navigate to Risks and link the component. Task exists, contextual discovery requires extra navigation. | DEGRADED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-risks-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-risks-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-component-risks.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v1-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v2-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v1.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-risk-link-v2.json) | M1-07 |

## Implementation Authorizations

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 46 | Authorization create/edit | POST 201; subsequent PUT 200 with valid date/party data. | POST 201; subsequent PUT 200 with valid date/party data. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-create-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-create.json) · [V1 edit](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorization-edit-v1.json) · [V2 edit](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-implementation-editors.json) | NEW |
| 47 | Inherited-capability shortcut | Local shortcut in authorization surface. | Local shortcut absent; inherited URL still works. Supported discovery contract unresolved. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-form.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-hidden-route-reachability.json) | M1-07 |

## SSP Control Implementation

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 48 | Requirements/statements/component data | Seeded 7 statements and 12 component implementations before profile synchronization. | Corresponding data present on the same fixture. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-2.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-4.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control.json) | NEW |
| 49 | Requirement create | POST 201 with disposable control ID. | POST 201 with disposable control ID. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-requirement-create-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-create-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-v1-requirement-create.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-create.json) | NEW |
| 50 | Statement edit and stable identifier | Editable Statement ID; PUT 200. | Statement ID read-only; PUT 200 with full fields. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-statement-edit-v1-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-statement-edit-form-1.jpg) · [V1 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-statement-edit-v1.json) · [V2 requests](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-statement-edit-form.json) | M2-24 |
| 51 | Requirement query URL | Target requirement remains in available full list. | URL controlId=zz-parity-full-reload-v2 displays AC-1 detail. Target exists after POST 201; normal row selection does not write this query. Direct query and displayed content disagree. | DEGRADED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-query-contract-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-query-contract-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-query-contract.json) · [create/reload sequence](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-deep-link.json) | NEW-06 |

## SSP Compliance

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 52 | Compliance counts | Low profile: 664 controls; 3 Not Satisfied, 661 Unknown. | Same counts; desktop table has no horizontal overflow. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-compliance-view-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-compliance-view-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-compliance-view.json) | M1-02 |

## SSP JSON

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 53 | JSON load/download | Full 200; downloaded JSON valid, 158067 bytes. | Full 200; downloaded JSON valid, 158067 bytes. Clipboard capture also valid, 158067 bytes. V1 clipboard action itself not exercised. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-success-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-success-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-success.json) · [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-actions-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-actions-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-actions.json) | NEW |
| 54 | GoodRead full document | GET /full returns 500. | Same seeded SSP GET /full returns 500. Other tested copies return 200. | BROKEN | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-goodread-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-goodread-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-goodread.json) | NEW-03; main-origin |

## Controls — /controls

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 55 | No active SSP gate | Requires active system. | Requires active system. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-gates-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-gates-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-gates.json) | NEW |
| 56 | Active SSP without profile | No available options. | Explicit prerequisite gate with Open Active SSP action. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-no-profile-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-no-profile-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-no-profile.json) | NEW |
| 57 | Tree/data and control ID search | Family tree requires expansion; ac-1 search shows no available options. | Family expansion and ac-1 search expose matching table rows; data requests 200. | IMPROVED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions.json) · [V1 expanded tree](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-v1-tree-1.jpg) · [V2 expansion](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-expand-2.jpg) | M1-05 |
| 58 | OPEN details | Tree supplies control entries; equivalent detailed drawer not exercised in this pass. | OPEN drawer shows statements, shared responsibilities and components; GET 200. V1 functional equivalence requires further exercise. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-actions.json) · [V2 drawer](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-drawer-1.jpg) · [drawer state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-drawer.json) | M1-05 |
| 59 | IMPLEMENT entry | Control implementation entry available. | IMPLEMENT opens statement/component actions with successful GETs. Saving a component implementation through this drawer not exercised. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-implement-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-implement-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-controls-implement.json) | M1-05 |
| 60 | Apply All Suggestions affordance | Apply All Suggestions visible. AI disabled; effect not exercised. | Bulk suggestion action absent from tested surface. Retained task M1-03 needs V2 ownership; AI execution remains unverified. | MISSING | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-2.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control-4.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-authorizations-control.json) | M1-03 |

## Active system — /system

| # | Feature | V1 behaviour | V2 behaviour | Verdict | Evidence (screenshots, request diff) | Backlog ref |
| --- | --- | --- | --- | --- | --- | --- |
| 61 | Compact summary ownership | Full active-system overview. | Compact summary with working destination links. Full workflows remain reachable. | INTENTIONAL | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-links-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-links-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-links.json) | M1-12; SSP unification handoff |
| 62 | Active-system shortcuts | Users/components/authorizations/compliance/JSON destinations load. | All five links load retained /system/* routes with GET 200. They do not alias to canonical /system-security-plans/:id. Canonical detail is reachable through library View. | PARITY | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts.json) | M1-12 |
| 63 | Canonical route alias proposal | Active-system route family exists. | Retained route family functions; whether /system must alias canonical detail is a product decision, not a proven broken task. | UNVERIFIED | [V1](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts-1.jpg) · [V2](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts-2.jpg) · [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-system-shortcuts.json) | handoff proposal:359 |
## Defect follow-ups

This table proposes work; no ticket or backlog file is created or edited.

| ID | Title | Sev | Origin | Area / route | Problem | Fix direction | Sources | PRD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NEW-03 | Return GoodRead full JSON | P1 | main | SSP JSON | Both UIs receive GET /full 500 for GoodRead. | Diagnose the full-document API failure. | [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-json-goodread.json) | — |
| NEW-04 | Invalidate the server session on logout | P1 | main | Auth logout | Both UIs show sign-in while users/me returns 200; V2 logout POST returns 404. | Reconcile logout endpoint and invalidate the accepted session. | [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-logout.json) | §4.5.5 |
| NEW-05 | Coordinate expired-session feedback | P2 | main | Authenticated axios / 401 | V1 shows three identical errors; V2 shows four plus profile-loading error. | Handle the expiry transition once and preserve useful return context. | [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-auth-expiry.json) | — |
| NEW-06 | Honor requirement query selection | P2 | branch | SSP Control Implementation | V2 URL names zz-parity-full-reload-v2 while detail displays AC-1. | Define and honor the supported query contract; decide search persistence independently. | [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-requirement-query-contract.json) | — |
| NEW-07 | Resolve Moderate profile catalog imports | P1 | main | SSP profile attachment | Both UIs receive 500: no valid catalog UUID in backmatter, ref #051a77c1-b61d-4995-8275-dacfe688d510. | Resolve the profile import reference, then verify simultaneous binding/switching. | [requests/state](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-profiles-multiple.json) | — |

Existing references remain M3-12 (safe destructive keyboard behavior), M4-02 (filter scoping), M1-15 (template reuse), M3-06 (expiry context), M1-07 (contextual risk discovery) and M1-03 (bulk suggestions). Their evidence is in the page inventory; no duplicate NEW ticket is proposed.

## Design-contract questions

These carry no assigned defect severity. Guest theme access, manual SSP UUID authoring, architecture narrative ownership, metadata remarks visibility and inherited-capability discovery require a clear product contract. The approved compact overview, Implementation section consolidation, Edit mode for props/links, dedicated Compliance/JSON destinations and single DrawIO save are intentional. The /system canonical alias is a handoff proposal; its existing shortcuts complete their tasks.

## Coverage limits

- Authentication: external SSO success, configured banner, valid password-reset token and non-empty recovery on a disposable account; non-admin permission/403 behavior. Blank/invalid auth, callback failure, logout and expiry were exercised.
- Forms: every blank-field rule, populated privileges/roles/exports, arbitrary nested OSCAL preservation, all loading/tooltip states and full drawer focus trapping. Component Enter and Escape were exercised explicitly.
- Profiles: simultaneous bindings and switching are blocked by Moderate API 500. Low attach/remove succeeds. Profile synchronization creates requirements; removal of the binding does not demonstrate removal of generated requirements.
- DrawIO: blank-canvas create/export/save was exercised in both embedded editors. Nonblank shapes, import and malformed properties require additional data and checks.
- Controls: bulk/individual AI application, actual component-implementation save through the drawer, every status filter and conditional no-statement branch. Component filter linking flag is disabled. No risk-count cap test with more than 100 risks.
- Compliance: leverage drift/revocation/provider relationships, inherited badges and requirement-level component fixtures distinct from statement-level data.
- Filters: chart numerical/time-window reconciliation and persisted arbitrary local filter state. Shared create/edit flows were exercised on disposable filters.
- Retained routes: business logic is outside scope except reachability and the alternative risk-association workflow. Sidebar link presence is not a claim that all destinations were functionally tested.
- Light desktop only. Theme-menu presence was observed; switching to another theme and responsive layouts are outside this pass.

Characteristics section endpoints and the full document expose separate narrative data. A section readback after raw restoration does not establish a V2 data-loss defect. The deep key-conversion finding concerns the recorded payload, with no claim that every nested form path preserves all data.


### Runtime branches requiring further evidence

| Item | Required data or check | Code path / reference |
| --- | --- | --- |
| Permission hiding and 403 | Non-admin read/create-limited account | src/views/LeftSideNav.vue; src/views/layouts/AppV2Layout.vue; src/composables/axios/index.ts; M1-13, M0-07 |
| Login banner and external SSO success | Enabled banner; valid external identity/callback | src/views/auth-v2/LoginView.vue; src/views/auth-v2/SSOCallbackView.vue |
| Reset/recovery success | Disposable account and valid reset token | src/views/auth-v2/PasswordResetView.vue; src/views/auth-v2/ForgotPasswordView.vue |
| AI application and bulk suggestions | Enabled AI and applicable suggestions | src/views/control-implementations/partials/ControlImplementationSuggestions.vue; M1-03 |
| Component filter linking | Enabled feature flag and scoped filter | src/components/system-security-plans/ComponentsPanel.vue; M1-07 |
| Risk cap and badges | More than 100 open risks, appropriate statuses | src/components/system-security-plans/RiskOverviewSection.vue; M1-04 |
| Leverage/inherited compliance | Provider relationships, drift/revoked state | src/composables/useLeveragedControls.ts; src/components/ComplianceProgressPanel.vue; M1-02, M1-11 |
| Requirement-level components | Distinct populated requirement-level by-components | src/views/system-security-plans-v2/SystemSecurityPlanControlImplementationView.vue; M1-14 |
| Roles/exports/privileges | Populated disposable role/export/privilege data | src/components/v2/system-security-plans/forms/SystemImplementationUserModalForm.vue; src/components/v2/system-security-plans/forms/ControlImplementationModalForm.vue; M1-15, M2-22, M2-24 |
| Multiple profile switching | Two successfully attached profiles; Moderate is blocked by 500 | src/views/system-security-plans-v2/SystemSecurityPlanEditorView.vue; M1-06 |
| Chart numbers/time windows | Known populated time-series fixture | src/views/dashboards-v2/DashboardListView.vue; M4-02 |
| Library sorting/search/pagination | Interact with each control across multiple pages | src/views/system-security-plans-v2/SystemSecurityPlanListView.vue |
| DrawIO shapes/import and property validation | Disposable nonblank diagram and import document | src/views/system-security-plans-v2/SystemSecurityPlanCharacteristicsView.vue; M1-01 |
| UUID outside localhost secure context | Non-localhost HTTP origin | src/views/system-security-plans-v2/createSystemSecurityPlanDefaults.ts; src/utils/uuid.ts; M0-03 |
| Full focus trapping, transient feedback and arbitrary query states | Full keyboard traversal and delayed/error API matrix | src/router/v2.ts; src/views/system-security-plans-v2; src/views/controls-v2; M3-08, M3-10 |

## Cleanup and validation

[Object deletions](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-cleanup-objects.json) · [Fixture integrity and final lists](/Users/onselakin/.bb/thread-storage/thr_u6z6ckc78g/parity-evidence/full-cleanup-integrity.json)

| Object | UUID | Delete status |
| --- | --- | ---: |
| diagrams | `4914a90e-e3e4-4682-a6f3-64934a8e3c21` | 204 |
| diagrams | `409dd629-5082-477e-b98e-41eed1d82e26` | 204 |
| components | `c6f6e18d-bcb7-43b0-947b-f9fa7dd6a7c6` | 204 |
| components | `29adc867-3b14-40fa-93e6-248b5bcc2466` | 204 |
| users | `02b8d9cf-e1ba-411d-ab69-1ab346711c46` | 204 |
| users | `ccb4c0af-bbca-4472-a312-232797cc4904` | 204 |
| leveraged-authorizations | `148ddbf7-3442-44fd-bdb0-2efdadd3a3c3` | 204 |
| leveraged-authorizations | `ac1b8060-9b09-4229-b8cd-5f3176b3d12f` | 204 |
| requirements | `621ce31e-ed22-405c-814e-1bbfdc820979` | 204 |
| requirements | `19bb5464-1c68-4c12-afd2-543a5492b145` | 204 |
| requirements | `7ae2bb40-e8c5-4bba-9417-390613930df3` | 204 |
| requirements | `0b2b8760-ca66-447b-8c04-f8f33ef50e9b` | 204 |
| risks | `0cca6121-1161-4a61-80aa-14ff47db1a2e` | 204 |
| risks | `ad922ddd-581a-49ac-a591-12eec8e9c464` | 204 |
| filters | `df18ab57-9236-4d49-be8e-5ee961488935` | 204 |
| filters | `f0edc09b-35ec-4ca6-a3ca-bd0ee70e75c8` | 204 |
| ssp | `99ce4acf-4fff-442e-9228-adb1cef77812` | 204 |
| profile-binding | `512149a6-7f04-4c01-bb1b-78eafd6a950d` | 200 |
| ssp | `5959a5b5-a2e1-4540-8d6f-903e2e3e80cc` | 204 |
| ssp | `81cb1817-8f64-47c1-99b0-d09b7b9d46aa` | 204 |
| ssp | `3b3ace77-385b-4c3e-a156-3a1efc2cd34e` | 204 |

The V2 browser-deleted component `f4999b5a-5603-4e07-bc29-2889956e9c64` also returned DELETE 204. All explicit cleanup objects return 204 except profile-binding removal, which returns 200. The four disposable SSPs return 404 after deletion. No audit SSP or filter remains in list endpoints. Initial component creation before recorder recovery is evidenced by API presence and deletion; its POST response is not claimed as captured. Paired recorded component creations return 201.

Enterprise copy UUIDs were remapped for 40 identifiers; FedRAMP for 726. Parent deletion cascades copied and profile-generated children. Four manually created requirements, both authorizations, users, risks, components and diagrams were explicitly deleted. Global users, profiles, catalogs, evidence and shared filters were not modified.

Enterprise full-document SHA-256 remains `743617bab7352d0a930c8afe8073196c04f6676560e838d4ae445999a02c115d`; FedRAMP remains `027f3d109bd9a6a3e93cf5822fad1c9da7b9ee8990279e13d3d84f3c1f9ebfe6`. Both match starting snapshots. GoodRead remained read-only; its /full 500 prevents a comparable full-document hash.

The audit API (PID 44973), V2 server (45047) and V1 server (45772) are stopped. Final listener inspection finds none on ports 3000, 3001 or 8080. The headless browser session is closed, active-system browser storage is cleared, and the temporary V1 worktree is removed. The owner main checkout and api/.env were not edited.

Validation consists of the real-browser light-mode pass, API response/payload captures, recorded history/reload checks, deletion responses and fixture hashes. Unit tests/builds were not run because application code is unchanged. This report is the only repository artifact.
