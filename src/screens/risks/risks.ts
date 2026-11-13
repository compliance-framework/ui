import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import {
  defaultRiskFilters,
  readRiskFiltersFromQuery,
  type RiskFilters,
  type RiskSortBy,
  type SortDirection,
} from '@/utils/risk-register';
import { statuses, type StatusKey } from '@/ds/components/StatusBadge/statuses';

/**
 * Shared by the Risks dashboard, the register and the evidence record's Risks tab: the
 * register's URL state (the classic register's filter parameters, plus sort), the shared badge
 * for a risk status or level, and the tabs.
 */

/** The badge for a risk status or likelihood/impact level, when the shared vocabulary has one. */
export function riskBadge(value?: string): StatusKey | undefined {
  if (!value) return undefined;
  const normal = value
    .toLowerCase()
    .replace(/^risk-/, '')
    .replace(/^medium$/, 'moderate');
  const key = `risk-${normal}`;
  return key in statuses ? (key as StatusKey) : undefined;
}

export const LEVEL_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const SORT_OPTIONS: { value: RiskSortBy; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Created' },
  { value: 'review-deadline', label: 'Review deadline' },
  { value: 'status', label: 'Status' },
  { value: 'likelihood', label: 'Likelihood' },
  { value: 'impact', label: 'Impact' },
];

export interface RegisterView {
  filters: RiskFilters;
  sort: RiskSortBy;
  dir: SortDirection;
}

const FILTER_KEYS = Object.keys(defaultRiskFilters) as (keyof RiskFilters)[];

function single(value: LocationQuery[string] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readRegisterView(query: LocationQuery): RegisterView {
  const sort = single(query.sort);
  const dir = single(query.dir);
  return {
    filters: { ...defaultRiskFilters, ...readRiskFiltersFromQuery(query) },
    sort: SORT_OPTIONS.find((o) => o.value === sort)?.value ?? 'updated',
    dir: dir === 'asc' ? 'asc' : 'desc',
  };
}

/** The URL query for a register view, without its defaults. */
export function registerQuery(view: RegisterView): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  for (const key of FILTER_KEYS) {
    const value = view.filters[key];
    if (value && value !== defaultRiskFilters[key]) query[key] = value;
  }
  if (view.sort !== 'updated') query.sort = view.sort;
  if (view.dir !== 'desc') query.dir = view.dir;
  return query;
}

export function risksTabs(systemId: string) {
  return [
    { label: 'Dashboard', to: { name: 'system-risks', params: { systemId } } },
    {
      label: 'Register',
      to: { name: 'system-risks-register', params: { systemId } },
    },
  ];
}

/** A drill-down from the dashboard: the register narrowed by the given filters. */
export function registerLink(systemId: string, filters: Partial<RiskFilters>) {
  return {
    name: 'system-risks-register',
    params: { systemId },
    query: registerQuery({
      filters: { ...defaultRiskFilters, ...filters },
      sort: 'updated',
      dir: 'desc',
    }),
  };
}

/** A risk opens on its existing detail page, which offers "back" to This System > Risks. */
export function riskDetailLink(riskId: string) {
  return {
    name: 'risks:detail',
    params: { riskId },
    query: { from: 'system' },
  };
}
