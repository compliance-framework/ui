# AGENTS.md: compliance-framework/ui

Guidance for coding agents working in this repo. The README covers running and configuring
the UI. This file covers what you need to change it without breaking CI or misreading the
API.

## How this repo fits

- **ui** (this repo): Vue 3 + TypeScript + PrimeVue (unstyled, via Volt) + Tailwind v4. It
  talks only to the API.
- **api**: Go/Echo service on Postgres. It stores OSCAL documents, evidence and policy
  artifacts. Its Swagger is at `http://localhost:8080/swagger/index.html` in local-dev.
- **agent** and **plugin-\***: collect evidence and post it to the API. The UI never talks to
  them.
- **local-dev**: Docker Compose stack running all of the above. Use it for end-to-end checks.

The UI depends on the API's JSON shapes, which are typed by hand here. Releases are tags
(`vX.Y.Z`, or `vX.Y.Z-rcN`). CI publishes `ghcr.io/compliance-framework/ui`.

## Commands

```sh
make reviewable                              # format check + type-check + lint + unit tests: what CI runs, less the build
npx vitest run src/path/to/file.spec.ts      # one spec
npm run dev                                  # dev server on http://localhost:3000
VITE_API_URL=http://localhost:8080 npm run dev   # against a local-dev API
npm run format:fix                           # prettier --write src/
```

- **Node version.** CI and the Docker image use Node 20 (`engines` says `^20`), but newer
  Node versions work locally.
- **CI.** `.github/workflows/ci.yml` calls the shared `ci-ui.yml` from
  `compliance-framework/workflows`: ESLint (fails on errors), the Prettier check, type-check,
  unit tests, the build and the conformance drift check, plus the PR title, vulnerability and
  actionlint checks. The one check to require is `ci / required`. If `make reviewable` and
  `npm run build` pass, the Node checks should too.
- **Pre-commit hook.** The husky hook runs lint-staged, which reformats all of `src/`, not
  only staged files. Expect whitespace changes in files you didn't touch; that is fine.
- **Formatting.** ESLint does not check formatting; Prettier does. Its config is the
  `prettier` key in `package.json` (semicolons, single quotes, trailing commas).

## Layout

- `src/views/`: route pages. `src/router/index.ts` defines routes and gates them on
  `meta.requiresAuth` and permissions.
- `src/components/`: feature folders plus shared building blocks (`PageCard.vue`,
  `PageHeader.vue`, buttons).
- `src/volt/`: vendored Volt wrappers around unstyled PrimeVue. Not linted. Don't restyle or
  refactor them as part of feature work.
- `src/composables/axios/`: **the API client to use**: `useDataApi`,
  `useAuthenticatedInstance`, `useGuestApi`, `decamelizeKeys`.
- `src/composables/api/`: older fetch-based client. Don't extend it.
- `src/stores/`: Pinia stores. `config.ts` resolves the API URL: `VITE_API_URL`, otherwise
  `/config.json` at runtime over `src/defaultconfig.json`.
- `src/oscal/`, `src/types/`: hand-written API types (OSCAL and non-OSCAL).
- `src/utils/`, `src/parsers/`: pure helpers with co-located specs.

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
- Style with Tailwind classes, include `dark:` variants, and use `PageCard` for page sections.
- Only `PrimaryButton`, `SecondaryButton`, `CatalogGroup`, `CatalogControl` and `v-tooltip`
  are registered globally. Import everything else explicitly: there are no auto-imports.
- API types are written by hand in `src/types` or `src/oscal`. Match the API's JSON tags, after
  camelCasing.
- Tooltip text lives in `src/config/tooltips.ts` (see `docs/TOOLTIPS.md`).
- `src/components/LabelList.vue` hides labels whose names start with `_`, which are system
  labels such as `_policy` and `_agent`. Don't use it where every label must be shown.

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

- Hand-edit `src/volt/*` to fix a single page's styling. Pass classes or `pt` props instead.
- Commit `dist/`, `tests_output/` or `logs/`.
- Add a second Prettier config.
