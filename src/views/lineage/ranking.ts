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
