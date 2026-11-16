import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import { statuses } from '@/ds/components/StatusBadge/statuses';
import { heatBucket, type HeatBucket } from '@/components/lineage/heatScale';
import {
  isImplemented,
  isRiskMuted,
  type PostureDistribution,
} from '@/components/lineage/nodeMeta';
import type {
  LineageLeverageSummary,
  LineageNode,
  LineageRisk,
} from '@/composables/useLineage/types';
import type {
  ResponsibilityPostureValue,
  SSPLeverageSatisfaction,
} from '@/types/ssp-leverage';

/**
 * The Compliance Map's badges in the shared status vocabulary: open-risk heat, risk status and
 * severity, evidence state, a control's posture in an SSP, inheritance (leverage), and the posture
 * distribution bar. Each returns a status and, where the map's own wording differs, a label.
 */

export interface MapBadge {
  status: StatusKey;
  label?: string;
}

const HEAT: Record<Exclude<HeatBucket, 'accepted' | 'clear'>, StatusKey> = {
  neutral: 'heat-neutral',
  yellow: 'heat-low',
  amber: 'heat-moderate',
  orange: 'heat-high',
  red: 'heat-critical',
};

/** Open-risk heat for a risk roll-up: the open score sum, or accepted/mitigated risk only. */
export function riskHeatBadge(risk: LineageRisk): MapBadge {
  if (risk.openScoreSum <= 0 && risk.mutedScoreSum > 0)
    return { status: 'risk-accepted', label: 'Only accepted risk' };
  const status = HEAT[heatBucket(risk.openScoreSum) as keyof typeof HEAT];
  return {
    status,
    label: `${statuses[status].label} (${Math.max(risk.openScoreSum, 0)})`,
  };
}

/** A structural node's state: open-risk heat, accepted risk only, or implemented with none. */
export function structuralBadge(node: LineageNode): MapBadge {
  const open = node.risk?.openScoreSum ?? 0;
  const muted = node.risk?.mutedScoreSum ?? 0;
  if (open <= 0 && muted <= 0 && isImplemented(node))
    return { status: 'satisfied', label: 'Implemented, no open risk' };
  return riskHeatBadge(
    node.risk ?? ({ openScoreSum: 0, mutedScoreSum: 0 } as LineageRisk),
  );
}

/** A risk's status, when the vocabulary has it. */
export function riskStatusBadge(status?: string): MapBadge | undefined {
  if (!status) return undefined;
  const key = `risk-${status
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/^risk-/, '')}`;
  return key in statuses
    ? { status: key as StatusKey }
    : { status: 'unknown', label: status };
}

function severityFromScore(score?: number): string | undefined {
  if (score == null) return undefined;
  if (score >= 50) return 'critical';
  if (score >= 25) return 'high';
  if (score >= 10) return 'moderate';
  if (score >= 1) return 'low';
  return 'negligible';
}

/** A risk's severity (sent, or from its score); a muted risk's severity is shown neutral. */
export function severityBadge(node: LineageNode): MapBadge | undefined {
  const sev = (node.severity ?? severityFromScore(node.score))
    ?.toLowerCase()
    .replace(/^medium$/, 'moderate');
  if (!sev) return undefined;
  const key = `risk-${sev}`;
  if (!(key in statuses)) return { status: 'unknown', label: node.severity };
  if (isRiskMuted(node.status))
    return {
      status: 'heat-neutral',
      label: `${statuses[key as StatusKey].label} (no longer open)`,
    };
  return { status: key as StatusKey };
}

/** Evidence state: satisfied, not satisfied, or unknown, with the state as sent. */
export function evidenceBadge(status?: string): MapBadge {
  const s = (status ?? '').toLowerCase();
  if (
    s.includes('not') ||
    s === 'failed' ||
    s === 'unsatisfied' ||
    s === 'noncompliant'
  )
    return { status: 'not-satisfied' };
  if (s === 'satisfied' || s === 'compliant' || s === 'passed' || s === 'pass')
    return { status: 'satisfied' };
  return { status: 'unknown', label: status || undefined };
}

const POSTURE: Record<string, MapBadge> = {
  satisfied: { status: 'satisfied' },
  'not-satisfied': { status: 'not-satisfied' },
  inherited: { status: 'inherited' },
  attention: { status: 'needs-evidence' },
  'not-applicable': { status: 'not-applicable' },
  planned: { status: 'planned' },
  'out-of-scope': { status: 'out-of-scope', label: 'Not in profile' },
};

/** A control's posture in one SSP. */
export function postureBadge(posture?: string): MapBadge {
  return POSTURE[posture ?? ''] ?? { status: 'unknown', label: posture };
}

/** Inheritance that earns no posture credit (drifted, revoked, superseded), or plain inherited. */
export function leverageBadge(
  lev?: LineageLeverageSummary,
): MapBadge | undefined {
  if (!lev || lev.links === 0) return undefined;
  if (lev.status === 'drifted')
    return { status: 'capability-drifted', label: 'Inherited · drifted' };
  if (lev.status === 'revoked')
    return { status: 'capability-revoked', label: 'Inherited · revoked' };
  if (lev.status === 'superseded')
    return { status: 'capability-superseded', label: 'Inherited · superseded' };
  return { status: 'inherited' };
}

/** How fully an inherited capability is implemented downstream. */
export function satisfactionBadge(value: SSPLeverageSatisfaction): MapBadge {
  return value === 'full'
    ? { status: 'implemented' }
    : { status: 'needs-evidence', label: 'Action needed' };
}

/** Whether evidence covers one inherited responsibility. */
export function responsibilityBadge(
  value?: ResponsibilityPostureValue,
): MapBadge {
  if (value === 'satisfied') return { status: 'satisfied', label: 'Covered' };
  if (value === 'not-satisfied')
    return { status: 'not-satisfied', label: 'Not covered' };
  return { status: 'unknown', label: 'No evidence yet' };
}

const SEGMENT_STATUS: Record<string, StatusKey> = {
  satisfied: 'satisfied',
  inherited: 'inherited',
  attention: 'needs-evidence',
  notSatisfied: 'not-satisfied',
  notApplicable: 'not-applicable',
  planned: 'planned',
  outOfScope: 'out-of-scope',
};

/** A posture distribution as DistributionBar segments. */
export function distributionSegments(distribution: PostureDistribution) {
  return distribution.segments.map((segment) => ({
    status: SEGMENT_STATUS[segment.key] ?? ('unknown' as StatusKey),
    count: segment.count,
  }));
}

/** The node type, in words. */
export const NODE_TYPE_LABELS: Record<string, string> = {
  'standard-catalog': 'Standard',
  'policy-catalog': 'Policy catalog',
  'procedure-catalog': 'Procedure catalog',
  group: 'Group',
  control: 'Control',
  'policy-control': 'Policy',
  'procedure-control': 'Procedure',
  risk: 'Risk',
  evidence: 'Evidence',
};
