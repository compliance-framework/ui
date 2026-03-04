Title: POAM Phase 1 – UI Design

Goals

- Provide a basic POAM Items list page to exercise the API filters end-to-end.
- Keep UX simple for Phase 1; extend with create/edit flows in Phase 2.

Routing

- New authenticated route: /poam-items
- Router entry added under app routes; guard via existing auth store.

Data Access

- Uses existing composables (useFetch/useApi) to call /api/poam-items
- Query params supported: status, sspId, riskId, deadlineBefore (RFC3339)

View: CCFPoamItemsListView

- Filters
  - Dropdown: status (open|in-progress|completed|overdue)
  - Inputs: sspId UUID, riskId UUID, deadlineBefore RFC3339
  - Apply triggers a reload with current params
- Table Columns
  - Title, Status, Deadline, POC (name/email), Updated

Future Enhancements

- Create/Edit forms for POAM items and milestones
- Mark milestone completed, auto-set completed_at
- Link POAM item to risks from the UI
- Pagination and sorting

Verification

- API is reachable at /api/poam-items
- UI config.json provides API_URL
- Manual test by applying filters and verifying table updates
