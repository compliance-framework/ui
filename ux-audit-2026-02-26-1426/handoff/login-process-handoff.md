# Login Process Redesign - Developer Handoff

Audit package: `ux-audit-2026-02-26-1426`
Target: Login process (password + SSO) including account recovery and logout
Prototype: `ux-audit-2026-02-26-1426/new-design.pen`
Style guide: `webapp-01-industrialtechnical_light`
Viewport: Desktop web 1440x900 minimum (full-page screens; no narrow cards)

## 1) Goals

- Reduce sign-in friction by making the SSO vs password choice obvious and fast.
- Make system status explicit (providers loading, callback processing, session expired).
- Anchor errors at the point of action (banner + field-level), not only toasts.
- Close the accessibility gap: labels, ids, autocomplete, keyboard flow, focus states.
- Prevent accidental logout (audit evidence: keyboard users triggering logout unintentionally).

## 2) Scope

In scope:

- `/auth/login`: password login + SSO providers list + session-expired notice + error states.
- `/auth/forgot-password`: request reset flow.
- `/auth/password-reset?token=...`: reset password flow.
- `/auth/sso/callback?next=...`: finalize SSO sign-in, then redirect.
- `/auth/logout`: new confirmation step before logging out.
- Guest layout: new two-column auth shell.

Out of scope (unless you choose to extend later):

- Changes to authenticated (AppLayout) navigation and pages.
- New backend endpoints or changes to auth contracts.
- Full design system rebuild (this is scoped to auth screens).

## 3) Screens and States (Desktop)

All screens are full-page desktop frames in the prototype. Use these as the reference states:

Login (`/auth/login`):

- "Auth / Login / Default"
- "Auth / Login / Session Expired" (arrives from global 401 or redirect from protected route)
- "Auth / Login / Error" (invalid credentials and field errors)
- "Auth / Login / SSO Providers Loading" (providers request in flight)
- "Auth / Login / SSO Unavailable" (providers loaded, none available)

Forgot password (`/auth/forgot-password`):

- "Auth / Forgot Password / Default"
- "Auth / Forgot Password / Sent" (anti-enumeration success state)

Reset password (`/auth/password-reset?token=...`):

- "Auth / Reset Password / Form" (token verified, show form)
- "Auth / Reset Password / Invalid Link" (token invalid/expired or missing)

SSO callback (`/auth/sso/callback?next=...`):

- "Auth / SSO Callback / Loading"
- "Auth / SSO Callback / Error"

Logout confirmation (`/auth/logout`):

- "App / Logout / Confirm"

## 4) Layout Spec

Auth shell (Guest layout) is a two-column composition:

- Canvas: 1440x900 minimum.
- Left brand panel: 560px fixed width.
- Right content column: 640px fixed width.
- Whole composition centered horizontally on the page.

Right content column structure (consistent across auth routes):

- Top bar row: route label left; "DOCS" / "SUPPORT" links right.
- Content stack:
  - Optional notice banner (session expired, return after sign-in).
  - Main panel: header (title + subtitle), banners, fields, primary action, secondary links.
  - Optional supporting panel ("What happens next" for forgot password).

Control sizing:

- Input/button height: 44px.
- Panel padding: 20px.
- Section gaps: 16px (form vertical rhythm), 20px (panel to panel), 32px (top-level column spacing).

## 5) Affected Components & Views

Routes and views:

- `/auth/login` -> `src/views/LoginView.vue`
- `/auth/forgot-password` -> `src/views/ForgotPasswordView.vue`
- `/auth/password-reset` -> `src/views/PasswordResetView.vue`
- `/auth/sso/callback` -> `src/views/SSOCallbackView.vue`
- `/auth/logout` -> `src/views/LogoutView.vue`
- Guest shell -> `src/views/layouts/GuestLayout.vue`

Shared / supporting:

- Auth store -> `src/stores/auth.ts`
- Auth routing + guard -> `src/router/index.ts`
- Axios auth handling -> `src/composables/axios/index.ts`
- SSO providers -> `src/composables/useOIDC.ts`
- Logout entry points:
  - Profile dropdown -> `src/components/ProfileDropdown.vue`
  - Left nav footer -> `src/views/LeftSideNav.vue`

## 6) File Manifest (Expected Touch List)

Auth layout + styling:

- `src/views/layouts/GuestLayout.vue`
- `index.html` (add Space Grotesk + JetBrains Mono font imports)
- `src/assets/main.css` (add auth-specific CSS variables/classes; keep existing app theme intact)

Auth views:

- `src/views/LoginView.vue`
- `src/views/ForgotPasswordView.vue`
- `src/views/PasswordResetView.vue`
- `src/views/SSOCallbackView.vue`
- `src/views/LogoutView.vue`

Flow/logic:

- `src/composables/axios/index.ts` (401 redirect includes `next` and `error=session_expired`)
- `src/composables/useOIDC.ts` (provider loading/error semantics)
- `src/components/ProfileDropdown.vue` (route to `/auth/logout` confirm instead of immediate logout)
- `src/views/LeftSideNav.vue` (logout link targets confirm route)

Recommended new helper:

- `src/utils/authNavigation.ts` (shared `isSafeRelativePath()` + `resolveNextLocation()`)

Tests (as needed):

- `src/components/__tests__/ProfileDropdown.spec.ts`

## 7) Style Guide Mapping (webapp-01-industrialtechnical_light)

This redesign intentionally diverges from the current "blue" UI for auth routes only.

### Colors (use CSS vars + Tailwind arbitrary values)

Define auth tokens (example names) and use via `bg-[var(--auth-...)]` etc:

- Background: #18181B -> `--auth-bg`
- Card: #0F0F10 -> `--auth-card`
- Surface: #141415 -> `--auth-surface`
- Border: #27272A -> `--auth-border`
- Text primary: #FAFAFA -> `--auth-fg`
- Text muted: #A1A1AA -> `--auth-fg-muted`
- Text secondary: #71717A -> `--auth-fg-secondary`
- Text tertiary: #52525B -> `--auth-fg-tertiary`
- Accent: #FACC15 -> `--auth-primary`
- Accent foreground: #0F0F10 -> `--auth-primary-fg`
- Error: #EF4444 -> `--auth-error`
- Success: #22C55E -> `--auth-success`
- Info: #3B82F6 -> `--auth-info`

### Typography

- UI/body: JetBrains Mono (ALL CAPS for labels/buttons; `tracking-[1px]`).
- Headings: Space Grotesk (32px titles; 18px section headers).

Implementation notes:

- Do not swap the global app font. Scope fonts to auth shell with `.auth-ui` and `.auth-display`.

### Corner Radius and Borders

- Radius: 0 everywhere (`rounded-none`).
- Primary structure: 1px borders (no heavy shadows).
- Active emphasis: 3px left accent bar on banners/steps.

### Component Patterns

- Banner: left accent bar + title line (11px uppercase) + body copy.
- Inputs: 44px height, monospace, high-contrast borders, visible focus ring (yellow).
- Buttons:
  - Primary: yellow fill, dark text.
  - Outline: surface fill + 1px border.
- Divider: line - label - line.

## 8) Interaction Logic and Edge Cases

### Safe redirect (`next` query)

Problem:

- `src/views/LoginView.vue` currently pushes `route.query.next` directly.
- `src/views/SSOCallbackView.vue` already implements safe relative path validation.

Requirement:

- Unify logic across Login, SSO callback, and Logout cancel:
  - Accept only safe relative paths (`/...` but not `//...` and not a scheme like `http:`).
  - Fallback to `{ name: 'home' }`.

### Password login (`/api/auth/login`)

Required changes:

- Fix status handling bug: `AxiosError` uses `error.response?.status`, not `error.status`.
- Render field errors robustly (`errors.email || []`, `errors.password || []`).
- Show banner + inline errors for 401; reserve toast for global notice.
- Add loading state: disable submit, replace label with "SIGNING IN...".

Status handling:

- 401: show banner "Invalid email or password" + field hints.
- 422: show validation banner; rely on field errors when present.
- 429: show "Too many attempts" banner.
- Network error: show "Unable to reach server" banner.

Accessibility:

- Ensure `label for` matches input `id` (Login currently missing ids).
- Add `type="email"` and `autocomplete="username"` for email.
- Add `autocomplete="current-password"` for password.
- Apply `aria-invalid` when field has errors.

### SSO providers

Problem:

- Current UX can show "No SSO providers" while providers are still loading.

Requirement:

- State model in UI:
  - Loading: show "Loading providers" message; keep password sign-in available.
  - Error: show "Unable to load providers" banner; do not claim misconfiguration.
  - Empty: show "SSO not configured" state.
  - Ready: show provider buttons.

### Session expired (global 401)

Current:

- `src/composables/axios/index.ts` redirects to `{ name: 'login' }` with a toast.

Requirement:

- Redirect with context: `{ name: 'login', query: { next: to.fullPath, error: 'session_expired' } }`.
- Login view maps `error=session_expired` to the "Session expired" notice state.

### Forgot password

Requirement:

- Prevent account enumeration: always show "Sent" state after submit, regardless of whether email exists.
- Show an error banner only for transport/server failures (timeout, 5xx).
- Keep "Back to sign in" visible and stable.

### Reset password

Requirement:

- If token missing or invalid format: show "Invalid link" state and hide the reset form.
- Treat API 401 as invalid/expired token.
- Keep requirements visible while typing; show mismatch inline.

### SSO callback

Requirement:

- Replace current small center card with full-page state.
- On success: show short success state then redirect to safe `next`.
- On error: show error state with a clear "Return to sign in" action.
- Handle 403 from `/api/users/me` as "no access" and direct to admin/support.

### Logout confirmation (audit issue: accidental logout)

Requirement:

- `/auth/logout` becomes a confirmation step.
- Cancel is the safe default (first in tab order and primary visual emphasis).
- Confirm:
  - Call `POST /api/auth/logout`.
  - Always clear local auth state (`userStore.logout()`), even if API call fails.
  - Navigate to login.
- Update logout entry points to route to confirm rather than immediately logging out.

## 9) Implementation Priority (Start Here)

1. Implement Guest auth shell layout in `src/views/layouts/GuestLayout.vue` (two-column, centered).
2. Add fonts (JetBrains Mono + Space Grotesk) in `index.html` and scope usage to auth shell.
3. Refactor `src/views/LoginView.vue`:
   - new layout
   - safe `next`
   - correct error handling
   - SSO provider loading/error/empty states
4. Refactor `src/views/SSOCallbackView.vue` to match the new full-page states.
5. Refactor forgot/reset views to the new panel patterns.
6. Implement logout confirmation view and rewire logout entry points.
7. Update axios 401 redirect to include `next` + `error=session_expired`.
8. Update tests affected by logout behavior changes.

## 10) Acceptance Criteria / QA Checklist

- Desktop: looks correct at 1440x900; no "max-w-96" auth cards.
- Keyboard:
  - Visible focus on all interactive elements.
  - Enter submits forms; Escape cancels logout confirm.
  - Logout cannot be triggered accidentally without confirmation.
- A11y:
  - Labels correctly bound to inputs; autocomplete present.
  - Errors are announced via standard patterns (aria-invalid + inline text).
- Correct state messaging:
  - SSO providers loading does not show "not configured".
  - Session expired notice appears after 401 redirects.
- Security:
  - `next` is safe relative only; no open redirects.
  - Forgot password does not reveal whether an email exists.

## 11) References

- Audit evidence: `ux-audit-2026-02-26-1426/reports/controls.md` (logout accidental activation risk)
- Expert analysis: `ux-audit-2026-02-26-1426/ux-expert-analysis.md`
- Prototype file: `ux-audit-2026-02-26-1426/new-design.pen`
