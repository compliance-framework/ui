// Rego diagnostics for a bundle module (LLD U4.5), merged from three sources and deduped by
// (row, col, message):
//   1. the last preview's policyErrors (bundle + module-relative path, R47);
//   2. the 422 policy-errors of the last failed save;
//   3. the selected instance's reported policyErrors — ONLY when it rejected the desired
//      revision for policy-errors and the module text is unchanged since that revision
//      (otherwise the rows would be stale).

import type {
  AgentInstanceSummary,
  ConfigPreview,
  PolicyError,
} from '@/types/agent-config';

export interface ReportContext {
  instance: AgentInstanceSummary | null;
  desiredRevision: number;
  /** Whether bundle/path's text equals its text in the desired revision. */
  unchanged: (bundle: string, path: string) => boolean;
}

export function reportErrorsUsable(ctx: ReportContext): boolean {
  const i = ctx.instance;
  return (
    !!i &&
    i.status === 'rejected' &&
    i.reason === 'policy-errors' &&
    i.attemptedRevision === ctx.desiredRevision
  );
}

export function moduleDiagnostics(
  bundle: string,
  path: string,
  preview: ConfigPreview | null,
  saveErrors: PolicyError[],
  report: ReportContext,
): PolicyError[] {
  const match = (e: PolicyError) => e.bundle === bundle && e.path === path;
  const out: PolicyError[] = [];
  const seen = new Set<string>();
  const push = (e: PolicyError) => {
    const k = `${e.row ?? ''}|${e.col ?? ''}|${e.message}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  (preview?.policyErrors ?? []).filter(match).forEach(push);
  saveErrors.filter(match).forEach(push);
  if (reportErrorsUsable(report) && report.unchanged(bundle, path)) {
    (report.instance?.policyErrors ?? []).filter(match).forEach(push);
  }
  return out;
}
