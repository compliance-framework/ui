// Ordering + pagination for the drill-down graph. Each column shows the "worst"
// nodes first and reveals them 5 at a time.

import type { LineageNode } from '@/composables/useLineage/types';

/** How many boxes a column reveals per page (initial load and each "…more"). */
export const COLUMN_PAGE_SIZE = 5;

/**
 * Sort a level worst-first: highest open-risk score, then lowest compliance %,
 * then title for a stable order. Returns a new array (input untouched).
 */
export function worstFirst(nodes: LineageNode[]): LineageNode[] {
  return [...nodes].sort((a, b) => {
    const byRisk = b.risk.openScoreSum - a.risk.openScoreSum;
    if (byRisk !== 0) return byRisk;
    const byCompliance =
      a.compliance.compliancePercent - b.compliance.compliancePercent;
    if (byCompliance !== 0) return byCompliance;
    return a.title.localeCompare(b.title);
  });
}
