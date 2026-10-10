// Ordering + pagination for the drill-down graph. Each column shows the "worst"
// nodes first and reveals them 5 at a time.

import type { LineageNode } from '@/composables/useLineage/types';
import { nodeRankScore } from '@/components/lineage/nodeMeta';

/** How many boxes a column reveals per page (initial load and each "…more"). */
export const COLUMN_PAGE_SIZE = 5;

/**
 * Sort a level worst-first. "Worst" is type-aware (open risk for structural
 * nodes, score for risks, failing state for evidence — see nodeRankScore), then
 * lowest compliance %, then title for a stable order. Returns a new array.
 */
export function worstFirst(nodes: LineageNode[]): LineageNode[] {
  return [...nodes].sort((a, b) => {
    const byRank = nodeRankScore(b) - nodeRankScore(a);
    if (byRank !== 0) return byRank;
    const byCompliance =
      (a.compliance?.compliancePercent ?? 0) -
      (b.compliance?.compliancePercent ?? 0);
    if (byCompliance !== 0) return byCompliance;
    return a.title.localeCompare(b.title);
  });
}

/** Non-risk nodes, rendered individually (unchanged from pre-grouping behavior). */
export function structuralNodes(nodes: LineageNode[]): LineageNode[] {
  return nodes.filter((n) => n.nodeType !== 'risk');
}

// A column of a control's children mixes structural/evidence nodes with risk
// nodes (a control can be linked to risks across several SSPs). Risk nodes are
// bucketed into one container per owning SSP so cross-SSP risks under the same
// control don't read as belonging to one plan.
export interface RiskGroup {
  sspId: string;
  sspTitle: string;
  nodes: LineageNode[];
}

/**
 * Group a column's risk nodes by their owning SSP (risk.sspId — a risk always
 * has exactly one). Groups are worst-first by their worst member, matching the
 * column's own ordering; nodes within a group keep the order they arrived in.
 */
export function riskGroups(nodes: LineageNode[]): RiskGroup[] {
  const risks = nodes.filter((n) => n.nodeType === 'risk');
  if (!risks.length) return [];
  const order: string[] = [];
  const groups = new Map<string, RiskGroup>();
  for (const n of risks) {
    const sspId = n.sspId ?? '';
    if (!groups.has(sspId)) {
      groups.set(sspId, {
        sspId,
        sspTitle: n.sspTitle || 'Unknown SSP',
        nodes: [],
      });
      order.push(sspId);
    }
    groups.get(sspId)!.nodes.push(n);
  }
  return order
    .map((id) => groups.get(id)!)
    .sort(
      (a, b) =>
        Math.max(...b.nodes.map(nodeRankScore)) -
        Math.max(...a.nodes.map(nodeRankScore)),
    );
}
