import type { Dashboard, DashboardCreate } from '@/stores/filters';

// Request shapes for /api/filters, mirroring main's ControlStatementImplementation.
//
// The endpoint binds camelCase JSON (json:"sspId"), so bodies are sent as-is,
// without decamelizeKeys. PUT is a full replacement: omitting sspId clears the
// filter's SSP binding and makes it global, so updates always echo it back.

export type FilterUpdateBody = Pick<
  DashboardCreate,
  'name' | 'filter' | 'controls'
> & { sspId: string | null };

// The API returns global filters plus those bound to sspId. Without sspId it
// returns filters from every SSP.
export function filterListParams(
  sspId: string,
  controlId?: string,
): Record<string, string> {
  return {
    ...(controlId ? { controlId } : {}),
    ...(sspId ? { sspId } : {}),
  };
}

// New filters created from a control are scoped to the active SSP.
export function buildCreateFilterBody(
  name: string,
  filter: Dashboard['filter'],
  controlId: string,
  sspId: string,
): DashboardCreate {
  return {
    name,
    filter,
    controls: [controlId],
    components: [],
    sspId: sspId || null,
  };
}

export function buildControlLinksBody(
  dashboard: Dashboard,
  controlIds: string[],
): FilterUpdateBody {
  return {
    name: dashboard.name,
    filter: dashboard.filter,
    controls: controlIds,
    sspId: dashboard.sspId ?? null,
  };
}
