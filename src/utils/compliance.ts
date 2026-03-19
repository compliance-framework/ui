import type {
  ProfileComplianceControl,
  ProfileComplianceStatusCount,
  ProfileComplianceSummary,
} from '@/types/compliance';

type ComplianceWidthSummary = Pick<
  ProfileComplianceSummary,
  'totalControls' | 'satisfied' | 'notSatisfied'
>;

export interface ComplianceWidths {
  satisfied: number;
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
      notSatisfied: 0,
      unknown: 0,
    };
  }

  const satisfied = percent(summary.satisfied, summary.totalControls);
  const notSatisfiedRaw = percent(summary.notSatisfied, summary.totalControls);

  const remaining = 100 - satisfied;
  const notSatisfied = Math.min(notSatisfiedRaw, remaining);

  const used = Math.min(satisfied + notSatisfiedRaw, 100);
  const unknown = 100 - used;

  return {
    satisfied,
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
    default:
      return 'Unknown';
  }
}
