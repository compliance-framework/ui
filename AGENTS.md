# AGENTS.md: compliance-framework/ui

Guidance for coding agents working in this repo. The README covers running and configuring
the UI. This file covers what you need to change it without breaking CI or misreading the
API.

## How this repo fits

- **ui** (this repo): Vue 3 + TypeScript, on its own design system (`src/ds`, built on
  reka-ui). It talks only to the API.
- **api**: Go/Echo service on Postgres. It stores OSCAL documents, evidence and policy
  artifacts. Its Swagger is at `http://localhost:8080/swagger/index.html` in local-dev.
- **agent** and **plugin-\***: collect evidence and post it to the API. The UI never talks to
  them.
- **local-dev**: Docker Compose stack running all of the above. Use it for end-to-end checks.

The UI depends on the API's JSON shapes, which are typed by hand here. Releases are tags
(`vX.Y.Z`, or `vX.Y.Z-rcN`) made by the release bot, never pushed by hand. Merging the
release-please PR releases `vX.Y.Z`. The `cut-prerelease` workflow cuts an rc. Each release
publishes `ghcr.io/compliance-framework/ui` (`release.yml`). `preview.yml` publishes `:main`
on pushes to `main`, and `:pr-<n>` for PRs labelled `preview`.

## Commands

```sh
make reviewable                              # format check + type-check + lint + unit tests: what CI runs, less the build
npx vitest run src/path/to/file.spec.ts      # one spec
npm run test:e2e                             # browser checks (axe, reflow, keyboard) for migrated screens
npm run dev                                  # dev server on http://localhost:3000
VITE_API_URL=http://localhost:8080 npm run dev   # against a local-dev API
VITE_API_PROXY=http://localhost:8080 npm run dev # same, proxied: works on any port (no CORS)
npm run format:fix                           # prettier --write src/
```

- **Node version.** CI (through `.nvmrc`) and the Docker image use Node 22 (`engines` says
  `^22`), but newer Node versions work locally.
- **CI.** `.github/workflows/ci.yml` calls the shared `ci-ui.yml` from
  `compliance-framework/workflows`: ESLint (fails on errors), the Prettier check, type-check,
  unit tests, the build and the conformance drift check, plus the PR title, vulnerability and
  actionlint checks. It also checks the built Docker image for fixable HIGH or CRITICAL
  vulnerabilities, outside the required check. The one check to require is `ci / required`.
  If `make reviewable` and `npm run build` pass, the Node checks should too.
- **Pre-commit hook.** The husky hook runs lint-staged, which reformats all of `src/`, not
  only staged files. Expect whitespace changes in files you didn't touch; that is fine.
- **Formatting.** ESLint does not check formatting; Prettier does. Its config is the
  `prettier` key in `package.json` (semicolons, single quotes, trailing commas).

## Layout

- `src/screens/`: route pages. `src/router/index.ts` defines routes and gates them on
  `meta.requiresAuth` and permissions.
- `src/ds/`: the design system: tokens, components, the `AppShell`/`ListTemplate` templates,
  `useApiQuery`, toasts (`useToast`) and confirmations (`useConfirm`).
- `src/components/`, `src/views/`: older feature folders, still in use, on the design system.
- `src/composables/axios/`: **the API client to use**: `useDataApi`,
  `useAuthenticatedInstance`, `useGuestApi`, `decamelizeKeys`.
- `src/stores/`: Pinia stores. `config.ts` resolves the API URL: `VITE_API_URL`, otherwise
  `/config.json` at runtime over `src/defaultconfig.json`.
- `src/oscal/`, `src/types/`: hand-written API types (OSCAL and non-OSCAL).
- `src/utils/`, `src/parsers/`: pure helpers with co-located specs.
- **Design system (this branch):** every page is on the design system; `docs/REDESIGN.md` has
  its rules, URL scheme and decisions. In `src/ds` and `src/screens`: scoped CSS using only
  `--ds-` tokens (`npm run lint:css` enforces them); screens contain no CSS or class
  attributes; read data through `useApiQuery` and render states with `DataState`. Raise toasts
  with `useToast()` from `@/ds/toasts` (the `ToastRegion` in `App.vue` shows them; errors stay
  until dismissed) and script confirmations with `useConfirm().require(...)` from
  `@/ds/confirm` (shown by `ConfirmHost`); in templates use `ConfirmDialog`. Add each new route
  to `e2e/a11y.spec.ts` and its API calls to `e2e/support/api.ts`.

## API client traps

These cause most API-related bugs in this repo:

- **Responses are deep-camelCased.** The authenticated axios instance runs `camelcaseKeys`
  over every response, including user-defined map keys (labels, props, raw JSON documents).
  To keep keys as sent, do one of these:
  - pass `camelcaseStopPaths` on the request (see `src/composables/useLeveragedControls.ts`).
    The paths are dot-paths into the _whole_ response body, envelope included. For
    `{"data": {"my_key": ...}}` use `['data']`; for `data.labels` inside it, use
    `['data.labels']`.
  - have the API return the document as a JSON string, as the evidence Playback endpoint does.
- **`decamelizeKeys` produces kebab-case**, for OSCAL. Use it as `transformRequest` only for
  OSCAL endpoints; for others it turns `fooBar` into `foo-bar`.
- **`useDataApi` unwraps the `{ data: ... }` envelope.** An endpoint that doesn't use the
  `GenericDataResponse` envelope comes back as `undefined`.
- **Binary and text responses** don't survive the default interceptors. Fetch them through
  `useAuthenticatedInstance()` with `responseType: 'text'` or `'blob'`.
- **Auth is cookie-based** (`withCredentials`). On a 401 the user is logged out and
  redirected; on a 403 a toast is shown and permissions are re-fetched.

## Conventions

- Components use `<script setup lang="ts">`; there is no Options API.
- Compose design-system components; new visual pieces go in `src/ds/components` with scoped
  CSS on `--ds-` tokens, which cover dark mode.
- Nothing is registered globally. Import everything explicitly: there are no auto-imports.
- API types are written by hand in `src/types` or `src/oscal`. Match the API's JSON tags, after
  camelCasing.
- Tooltip text lives in `src/config/tooltips.ts` (see `docs/TOOLTIPS.md`).

## Tests

- Vitest with jsdom. Put specs in `__tests__/*.spec.ts` next to the code, or co-locate them
  as `*.spec.ts`.
- Mock the API with
  `vi.mock('@/composables/axios', () => ({ useDataApi: vi.fn(() => ({ ... })) }))`.
- **Prefer a separate spec per new component.** Large view specs (e.g. `ViewView.spec.ts`)
  mock calls in order, so adding a request to a view can break unrelated cases.
- **jsdom gaps**:
  - `Blob.text()` is missing; read blobs with `FileReader`.
  - `URL.createObjectURL`/`revokeObjectURL` and `localStorage` are stubbed in
    `vitest.setup.ts`. Spy on them rather than replacing them.
- **Order in `<script setup>`.** Declare a `computed` before any `watch` that reads it,
  otherwise the component throws a temporal-dead-zone error at mount. Type-check doesn't catch
  this, but tests do.

## Don't

- Add Tailwind, PrimeVue or another component library; extend `src/ds` instead.
- Commit `dist/`, `tests_output/` or `logs/`.
- Add a second Prettier config.
