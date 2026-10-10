# agentconfig conformance fixture

`agentconfig-conformance.json` is the API's golden file
`pkg/agentconfig/testdata/conformance.json`, copied byte for byte (it is in
`.prettierignore`; do not edit it here). It holds the expected results of the
`pkg/agentconfig` rules that the UI re-implements (`glob.ts`, `cron5.ts`,
`field-access.ts`, `validation.ts`), and `../agentconfig-conformance.spec.ts`
runs every table against the UI's code.

Copied from: compliance-framework/api@c0b3792 (branch
`lisa/agent-config/05-overlay-validation`, api#473).

## Updating

1. The API changes a rule and regenerates the file:
   `go test ./pkg/agentconfig -run TestConformanceGolden -update`.
2. The UI copies it: `npm run sync:agentconfig-conformance -- [ref]` (the ref
   defaults to `main`), and records the API commit above.
3. Run `npx vitest run src/utils/agent-config/__tests__/agentconfig-conformance.spec.ts`
   and fix the UI code until every case passes.

CI (the extra command in `.github/workflows/ci.yml`) fails when this
copy differs from the API's `main`; until the file exists on `main` it passes
with a notice. `make reviewable` does not run it (no network in the local gate).

UI-only cases (stricter than the golden file on purpose) live in the rule's own
spec, e.g. the case-mismatched time zones in `cron5.spec.ts`.
