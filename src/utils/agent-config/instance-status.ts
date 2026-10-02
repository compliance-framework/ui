// Reported instance state → UI state (LLD U1.3). Uses the server's `status`, `syncStatus`
// and `stale` (R10, R14); there is no clock logic here.

import type { AgentInstanceSummary } from '@/types/agent-config';

export type InstanceUiStateName =
  | 'not-reported'
  | 'report-only'
  | 'rejected-unsafe'
  | 'rejected-forbidden'
  | 'rejected-invalid'
  | 'failed'
  | 'pending'
  | 'in-sync'
  | 'unknown';

export type ChipSeverity = 'success' | 'warn' | 'danger' | 'secondary';

export interface InstanceBadge {
  key: 'one-shot' | 'truncated' | 'report-stale' | 'file-warnings';
  label: string;
  tooltip?: string;
  severity: ChipSeverity;
}

export interface InstanceUiState {
  instanceId: string;
  state: InstanceUiStateName;
  chipLabel: string;
  severity: ChipSeverity;
  /** True for the rejected/failed rows (3–6). */
  problem: boolean;
  /** Rows 3–6 when the agent has not tried the latest revision yet. */
  olderRevision: boolean;
  stale: boolean;
  badges: InstanceBadge[];
}

const PROBLEM_STATES: InstanceUiStateName[] = [
  'rejected-unsafe',
  'rejected-forbidden',
  'rejected-invalid',
  'failed',
];

export function isProblemState(state: InstanceUiStateName): boolean {
  return PROBLEM_STATES.includes(state);
}

function baseState(
  inst: AgentInstanceSummary,
  desired: number,
): Pick<InstanceUiState, 'state' | 'chipLabel' | 'severity'> {
  const attempted = inst.attemptedRevision ?? '?';
  const pending = {
    state: 'pending' as const,
    chipLabel: `Pending r${inst.appliedRevision ?? 0} → r${desired}`,
    severity: 'warn' as const,
  };
  if (inst.status === 'unknown' || inst.reportedAt == null) {
    return {
      state: 'not-reported',
      chipLabel: 'No report',
      severity: 'secondary',
    };
  }
  if (inst.status === 'not-applicable' || inst.mode === 'report') {
    return {
      state: 'report-only',
      chipLabel: 'Report only',
      severity: 'secondary',
    };
  }
  if (inst.status === 'rejected' && inst.reason === 'unsafe-changes') {
    return {
      state: 'rejected-unsafe',
      chipLabel: `Rejected r${attempted}: needs apply_all`,
      severity: 'danger',
    };
  }
  if (inst.status === 'rejected' && inst.reason === 'forbidden-changes') {
    return {
      state: 'rejected-forbidden',
      chipLabel: `Rejected r${attempted}: forbidden change`,
      severity: 'danger',
    };
  }
  if (inst.status === 'rejected') {
    return {
      state: 'rejected-invalid',
      chipLabel: `Rejected r${attempted}`,
      severity: 'danger',
    };
  }
  if (inst.status === 'failed') {
    return {
      state: 'failed',
      chipLabel: `Failed r${attempted}`,
      severity: 'danger',
    };
  }
  if (inst.status === 'pending') return pending;
  if (inst.status === 'applied' && inst.syncStatus === 'in-sync') {
    return { state: 'in-sync', chipLabel: 'In sync', severity: 'success' };
  }
  if (inst.status === 'applied' && inst.syncStatus === 'out-of-sync')
    return pending;
  return { state: 'unknown', chipLabel: 'Unknown', severity: 'secondary' };
}

export function deriveInstanceState(
  inst: AgentInstanceSummary,
  desiredRevision: number,
): InstanceUiState {
  const base = baseState(inst, desiredRevision);
  const problem = isProblemState(base.state);
  const olderRevision =
    problem &&
    inst.attemptedRevision != null &&
    inst.attemptedRevision < desiredRevision;
  const badges: InstanceBadge[] = [];
  if (inst.daemon === false) {
    badges.push({
      key: 'one-shot',
      label: 'One-shot run',
      tooltip: 'Runs once and exits; pruned 24 h after it was last seen',
      severity: 'secondary',
    });
  }
  if (inst.truncated) {
    badges.push({
      key: 'truncated',
      label: 'Report truncated',
      tooltip:
        "The agent's report exceeded the size limit; some bundles or files may be missing",
      severity: 'warn',
    });
  }
  if (inst.reportStale) {
    badges.push({
      key: 'report-stale',
      label: 'Report older than last heartbeat',
      severity: 'secondary',
    });
  }
  const warnings = inst.warnings?.length ?? 0;
  if (warnings > 0) {
    badges.push({
      key: 'file-warnings',
      label: `${warnings} file warning${warnings === 1 ? '' : 's'}`,
      tooltip:
        "Problems in this agent's local file (tolerated; the affected plugins are skipped)",
      severity: 'warn',
    });
  }
  return {
    instanceId: inst.instanceId,
    ...base,
    chipLabel: olderRevision
      ? `${base.chipLabel} (older revision)`
      : base.chipLabel,
    problem,
    olderRevision,
    stale: inst.stale,
    badges,
  };
}

export interface SyncSummary {
  inSync: number;
  /** Non-stale instances in apply_safe/apply_all (R14 "fresh"). */
  expected: number;
  reportOnly: number;
  notReported: number;
  stale: number;
  /** Rows 3–6 on non-stale instances. */
  problems: { instanceId: string; hostname: string | null; label: string }[];
}

export function summarizeSync(
  instances: AgentInstanceSummary[],
  states: InstanceUiState[],
): SyncSummary {
  const summary: SyncSummary = {
    inSync: 0,
    expected: 0,
    reportOnly: 0,
    notReported: 0,
    stale: 0,
    problems: [],
  };
  instances.forEach((inst, i) => {
    const st = states[i];
    if (inst.stale) {
      summary.stale++;
      return;
    }
    if (inst.mode === 'apply_safe' || inst.mode === 'apply_all') {
      summary.expected++;
      if (st.state === 'in-sync') summary.inSync++;
    }
    if (st.state === 'report-only') summary.reportOnly++;
    if (st.state === 'not-reported') summary.notReported++;
    if (st.problem) {
      summary.problems.push({
        instanceId: inst.instanceId,
        hostname: inst.hostname,
        label: st.chipLabel,
      });
    }
  });
  return summary;
}
