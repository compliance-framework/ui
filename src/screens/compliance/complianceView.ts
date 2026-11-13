import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import type {
  ProfileComplianceControl,
  ProfileComplianceControlLeverage,
} from '@/types/compliance';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';

/**
 * This System > Compliance's view state in the URL: the profile shown (when several are
 * attached), the control status filter and a search. Defaults stay out of the URL.
 */
export type ControlStatus =
  'satisfied' | 'not-satisfied' | 'unknown' | 'inherited';

export interface ComplianceView {
  profile: string;
  status: ControlStatus | '';
  q: string;
}

const STATUSES: ControlStatus[] = [
  'satisfied',
  'not-satisfied',
  'unknown',
  'inherited',
];

function single(value: LocationQuery[string] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readView(query: LocationQuery): ComplianceView {
  const status = single(query.status);
  return {
    profile: single(query.profile),
    status: STATUSES.find((s) => s === status) ?? '',
    q: single(query.q).trim(),
  };
}

export function viewQuery(view: ComplianceView): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  if (view.profile) query.profile = view.profile;
  if (view.status) query.status = view.status;
  if (view.q) query.q = view.q;
  return query;
}

/** A control's status as the shared vocabulary names it; anything unrecognised is unknown. */
export function controlStatus(
  control: ProfileComplianceControl,
): ControlStatus {
  const status = control.computedStatus;
  return STATUSES.find((s) => s === status) ?? 'unknown';
}

export function filterControls(
  controls: ProfileComplianceControl[],
  view: ComplianceView,
): ProfileComplianceControl[] {
  const needle = view.q.toLowerCase();
  return controls.filter(
    (control) =>
      (!view.status || controlStatus(control) === view.status) &&
      (!needle ||
        `${control.controlId} ${control.title} ${control.groupTitle ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );
}

/** The evidence counts behind a control, as status segments for a bar. */
export function evidenceSegments(
  control: ProfileComplianceControl,
): { status: StatusKey; count: number }[] {
  const count = (status: string) =>
    control.statusCounts.find((item) => item.status === status)?.count ?? 0;
  return [
    { status: 'satisfied', count: count('satisfied') },
    { status: 'not-satisfied', count: count('not-satisfied') },
    { status: 'unknown', count: count('unknown') + count('incomplete') },
  ];
}

/** How an inherited control's link to its provider stands, in words. */
export function leverageLabel(
  leverage: ProfileComplianceControlLeverage,
): string {
  switch (leverage.status) {
    case 'drifted':
      return 'Inherited · drifted';
    case 'revoked':
      return 'Inherited · revoked';
    case 'superseded':
      return 'Inherited · superseded';
    default:
      return 'Inherited';
  }
}
