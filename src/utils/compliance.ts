import type {
  ProfileComplianceControl,
  ProfileComplianceControlLeverage,
  ProfileComplianceStatusCount,
  ProfileComplianceSummary,
} from '@/types/compliance';

type ComplianceWidthSummary = Pick<
  ProfileComplianceSummary,
  'totalControls' | 'satisfied' | 'notSatisfied' | 'inherited'
>;

export interface ComplianceWidths {
  satisfied: number;
  inherited: number;
  notSatisfied: number;
  unknown: number;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function computeComplianceWidths(
  summary?: ComplianceWidthSummary | null,
): ComplianceWidths {
  if (!summary) {
    return {
      satisfied: 0,
      inherited: 0,
      notSatisfied: 0,
      unknown: 0,
    };
  }

  const satisfied = percent(summary.satisfied, summary.totalControls);
  const inherited = percent(summary.inherited ?? 0, summary.totalControls);
  const notSatisfiedRaw = percent(summary.notSatisfied, summary.totalControls);

  // Segment order satisfied → inherited → notSatisfied → unknown (remainder).
  const remaining = Math.max(0, 100 - satisfied - inherited);
  const notSatisfied = Math.min(notSatisfiedRaw, remaining);

  const used = Math.min(satisfied + inherited + notSatisfiedRaw, 100);
  const unknown = 100 - used;

  return {
    satisfied,
    inherited,
    notSatisfied,
    unknown,
  };
}

export function controlKey(control: ProfileComplianceControl): string {
  return `${control.catalogId}:${control.controlId}`;
}

export function statusCount(
  control: ProfileComplianceControl,
  status: string,
): number {
  return (
    control.statusCounts.find(
      (item: ProfileComplianceStatusCount) => item.status === status,
    )?.count || 0
  );
}

export function statusClass(status: string): string {
  switch (status) {
    case 'satisfied':
      return 'bg-emerald-100 text-emerald-800';
    case 'not-satisfied':
      return 'bg-red-100 text-red-800';
    case 'inherited':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'satisfied':
      return 'Satisfied';
    case 'not-satisfied':
      return 'Not Satisfied';
    case 'inherited':
      return 'Inherited';
    default:
      return 'Unknown';
  }
}

// Badge styling for a control's leverage overlay (compliance table). Purple is the
// established "inherited" colour; drifted/revoked/superseded links de-escalate to
// amber/slate because they no longer carry clean inheritance credit.
const LEVERAGE_PURPLE =
  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
const LEVERAGE_AMBER =
  'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200';
const LEVERAGE_SLATE =
  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

export function leverageBadge(leverage: ProfileComplianceControlLeverage): {
  label: string;
  class: string;
} {
  switch (leverage.status) {
    case 'drifted':
      return { label: 'Inherited · drifted', class: LEVERAGE_AMBER };
    case 'revoked':
      return { label: 'Inherited · revoked', class: LEVERAGE_SLATE };
    case 'superseded':
      return { label: 'Inherited · superseded', class: LEVERAGE_SLATE };
    default:
      return { label: 'Inherited', class: LEVERAGE_PURPLE };
  }
}

export function leverageTooltip(
  leverage: ProfileComplianceControlLeverage,
): string {
  const origins = leverage.inheritedFrom
    .map(
      (origin) =>
        `From ${origin.upstreamSspTitle} — ${origin.offeringTitle} v${origin.offeringVersion}`,
    )
    .join('; ');
  let tip = `${origins} · ${leverage.outstandingCount}/${leverage.totalResponsibilities} responsibilities outstanding`;
  if (leverage.status === 'drifted') tip += ' · drifted — re-attest needed';
  return tip;
}
