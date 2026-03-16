export type RiskRegisterStatus =
  | 'open'
  | 'investigating'
  | 'mitigating-planned'
  | 'mitigating-implemented'
  | 'risk-accepted'
  | 'closed';

export type RiskReviewDecision = 'extend' | 'reopen';

export type RiskWorkflowStage =
  | 'intake'
  | 'investigation'
  | 'mitigation'
  | 'accepted'
  | 'closed'
  | 'unknown';

export interface RiskOwnerAssignmentDto {
  ownerKind: 'user';
  ownerRef: string;
  isPrimary: boolean;
}

export interface RiskOwnerAssignmentsPayload {
  primaryOwnerUserId?: string;
  ownerAssignments: RiskOwnerAssignmentDto[];
}

function normalizeOwnerRef(value?: string): string {
  return (value || '').trim();
}

const STATUS_LABELS: Record<RiskRegisterStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  'mitigating-planned': 'Mitigating Planned',
  'mitigating-implemented': 'Mitigating Implemented',
  'risk-accepted': 'Risk Accepted',
  closed: 'Closed',
};

export const ALLOWED_RISK_TRANSITIONS: Record<
  RiskRegisterStatus,
  RiskRegisterStatus[]
> = {
  open: ['investigating', 'closed'],
  // TODO(BCH-1206): UI actions for mitigation states are pending POA&M workflow support.
  investigating: ['mitigating-planned', 'risk-accepted'],
  'mitigating-planned': ['mitigating-implemented'],
  'mitigating-implemented': ['closed'],
  'risk-accepted': ['investigating', 'closed'],
  closed: [],
};

const RISK_STATUS_VALUES = new Set<RiskRegisterStatus>(
  Object.keys(STATUS_LABELS) as RiskRegisterStatus[],
);
const RISK_STATUS_ALIASES: Record<string, RiskRegisterStatus> = {
  accepted: 'risk-accepted',
};

function normalizeText(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function normalizeRiskRegisterStatus(
  status?: string,
): RiskRegisterStatus | null {
  const normalized = normalizeText(status);
  if (!normalized) return null;
  if (Object.prototype.hasOwnProperty.call(RISK_STATUS_ALIASES, normalized)) {
    return RISK_STATUS_ALIASES[normalized];
  }
  return RISK_STATUS_VALUES.has(normalized as RiskRegisterStatus)
    ? (normalized as RiskRegisterStatus)
    : null;
}

export function riskStatusLabel(status?: string): string {
  const normalized = normalizeRiskRegisterStatus(status);
  if (normalized) {
    return STATUS_LABELS[normalized];
  }
  if (!status) return 'Unknown';
  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeOwnerAssignments(
  payload?: RiskOwnerAssignmentsPayload,
): RiskOwnerAssignmentsPayload {
  const source = payload || { ownerAssignments: [] };
  const merged = new Map<string, RiskOwnerAssignmentDto>();

  for (const assignment of source.ownerAssignments || []) {
    if (assignment.ownerKind !== 'user') continue;
    const ownerRef = normalizeOwnerRef(assignment.ownerRef);
    if (!ownerRef) continue;

    const existing = merged.get(ownerRef);
    if (existing) {
      existing.isPrimary = existing.isPrimary || !!assignment.isPrimary;
      continue;
    }

    merged.set(ownerRef, {
      ownerKind: 'user',
      ownerRef,
      isPrimary: !!assignment.isPrimary,
    });
  }

  const ownerAssignments = [...merged.values()];
  const normalizedPrimaryOwnerUserId = normalizeOwnerRef(
    source.primaryOwnerUserId,
  );
  const primaryOwnerUserId =
    normalizedPrimaryOwnerUserId ||
    ownerAssignments.find((assignment) => assignment.isPrimary)?.ownerRef ||
    ownerAssignments[0]?.ownerRef;

  if (
    primaryOwnerUserId &&
    !ownerAssignments.some(
      (assignment) => assignment.ownerRef === primaryOwnerUserId,
    )
  ) {
    ownerAssignments.unshift({
      ownerKind: 'user',
      ownerRef: primaryOwnerUserId,
      isPrimary: true,
    });
  }

  return {
    primaryOwnerUserId,
    ownerAssignments: ownerAssignments.map((assignment) => ({
      ...assignment,
      isPrimary:
        !!primaryOwnerUserId && assignment.ownerRef === primaryOwnerUserId,
    })),
  };
}

export function ownerAssignmentsSignature(
  payload?: RiskOwnerAssignmentsPayload,
): string {
  const normalized = normalizeOwnerAssignments(payload);
  return JSON.stringify({
    primaryOwnerUserId: normalized.primaryOwnerUserId || '',
    ownerAssignments: [...normalized.ownerAssignments]
      .map((assignment) => ({
        ownerKind: assignment.ownerKind,
        ownerRef: assignment.ownerRef,
        isPrimary: assignment.isPrimary,
      }))
      .sort((left, right) => left.ownerRef.localeCompare(right.ownerRef)),
  });
}

export function getAllowedRiskTransitions(
  status?: string,
): RiskRegisterStatus[] {
  const normalized = normalizeRiskRegisterStatus(status);
  if (!normalized) return [];
  return ALLOWED_RISK_TRANSITIONS[normalized];
}

export function canAcceptRisk(status?: string): boolean {
  return normalizeRiskRegisterStatus(status) === 'investigating';
}

export function canReviewRisk(status?: string): boolean {
  return normalizeRiskRegisterStatus(status) === 'risk-accepted';
}

export function riskWorkflowStage(status?: string): RiskWorkflowStage {
  const normalized = normalizeRiskRegisterStatus(status);
  switch (normalized) {
    case 'open':
      return 'intake';
    case 'investigating':
      return 'investigation';
    case 'mitigating-planned':
    case 'mitigating-implemented':
      return 'mitigation';
    case 'risk-accepted':
      return 'accepted';
    case 'closed':
      return 'closed';
    default:
      return 'unknown';
  }
}

export function riskWorkflowStageSummary(stage: RiskWorkflowStage): {
  title: string;
  description: string;
} {
  switch (stage) {
    case 'intake':
      return {
        title: 'Intake',
        description: 'Risk is open and awaiting investigation.',
      };
    case 'investigation':
      return {
        title: 'Investigation',
        description:
          'Risk analysis is in progress; it can move to mitigation or be accepted.',
      };
    case 'mitigation':
      return {
        title: 'Mitigation',
        description:
          'Mitigation work is planned or being implemented before closure.',
      };
    case 'accepted':
      return {
        title: 'Accepted',
        description:
          'Risk was accepted with justification and must be periodically reviewed.',
      };
    case 'closed':
      return {
        title: 'Closed',
        description: 'Risk lifecycle is complete with no further transitions.',
      };
    default:
      return {
        title: 'Unknown',
        description:
          'Status is outside the known risk-register workflow definition.',
      };
  }
}

export function riskWorkflowHints(status?: string): string[] {
  if (canAcceptRisk(status)) {
    return [
      'Use Accept Risk to record justification and define review deadline.',
    ];
  }
  if (canReviewRisk(status)) {
    return [
      'Use Review Risk to either extend the review deadline or reopen the risk.',
    ];
  }
  const next = getAllowedRiskTransitions(status);
  if (!next.length) {
    return ['No workflow actions are currently available for this status.'];
  }
  return [
    `Next allowed transitions: ${next.map((item) => riskStatusLabel(item)).join(', ')}.`,
  ];
}
