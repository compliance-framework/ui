# Representative local data

How the data for the 2026-10-10 browser pass was loaded. Use the same data for parity checks and the cutover rehearsal (Gate E).

## Prerequisites

- Postgres and the API running from the `api` repo (see its README), with the UI at http://localhost:3000.
- Log in as the local admin account.
- Run the commands below from the `api` repo root, using its built binary (`./tmp/ccf-api`).

## 1. OSCAL documents

Import the catalog first, so the profiles can resolve their controls:

```sh
./tmp/ccf-api oscal import -f testdata/sp800_53_catalog.json
./tmp/ccf-api oscal import -f testdata/basic-catalog.json
for f in profile_fedramp_low profile_fedramp_moderate sp800-53-component django aws \
         fedramp_ssp goodread_ssp ent_logging_ssp fedramp_ap goodread_ap \
         fedramp_ar goodread_ar fedramp_poam goodread_poam; do
  ./tmp/ccf-api oscal import -f "testdata/$f.json"
done
```

`profile_fedramp_moderate` imports but its controls don't resolve, because it references a catalog that isn't in `testdata/`. The `record not found` errors in the import output are normal: the importer checks for an existing record before each insert.

## 2. Seed commands

```sh
./tmp/ccf-api seed workflows -f cmd/seed/testdata/soc2_workflows.sample.json
./tmp/ccf-api seed lineage
./tmp/ccf-api seed evidence -a 60 -b 8      # 480 evidence records, labels provider/service/instance
./tmp/ccf-api seed heartbeats -aaaaa -bbbbbbbbbb
```

## 3. Through the API (as admin)

- **Risk templates:** POST each entry of `testdata/batch_upsert_risk_templates.json` to `/api/admin/risk-templates`. Copy the batch's `plugin-id` and `policy-package` into each template and drop its `id`. The batch endpoint is agent-only.
- **Subject templates:** do the same for `testdata/batch_upsert_subject_templates.json` with `/api/admin/subject-templates`.
- **Evidence filters (dashboards):** POST three filters to `/api/filters`, all with the scope `provider = AWS`:
  - "AWS EC2 Access Control" with `ac-2`, `ac-3`, `ac-6`, bound to the FedRAMP SSP;
  - "AWS EC2 Audit Logging" with `au-2`, `au-6`, `au-12`, bound to the FedRAMP SSP;
  - "Configuration Baseline" with `cm-2`, `cm-6`, `cm-7`, global.
- **Profile links:** POST `{"profileId": "<FedRAMP Rev 5 Low uuid>"}` to `/api/oscal/system-security-plans/<id>/profiles` for the FedRAMP and IFA GoodRead SSPs. Leave "Enterprise Logging and Auditing" unlinked, so the no-profile states can be tested.

## 4. Mixed evidence results

`seed evidence` marks every record satisfied. To get roughly 60% satisfied, 30% not satisfied and 10% other:

```sh
docker compose exec -T postgres psql -U postgres -d ccf \
  -c "update evidences set status = jsonb_build_object('state','not-satisfied','reason','fail') where abs(hashtext(id::text)) % 10 < 3;" \
  -c "update evidences set status = jsonb_build_object('state','other','reason','unknown') where abs(hashtext(id::text)) % 10 = 3;"
```

## Not covered by this data

- Agent configuration: no agents are registered.
- AI suggestions: AI is disabled.
- Policy evaluation: no evidence has the `policy-bundle-digest` prop.
- Workflow executions: none are run.
- The login banner: not configured.
