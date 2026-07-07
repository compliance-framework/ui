import { describe, it, expect } from 'vitest';
import { worstFirst, COLUMN_PAGE_SIZE } from '../ranking';
import type { LineageNode } from '@/composables/useLineage/types';

function node(
  title: string,
  openScoreSum: number,
  compliancePercent = 50,
): LineageNode {
  return {
    key: `k:${title}`,
    nodeType: 'control',
    title,
    compliance: {
      totalControls: 10,
      satisfied: 5,
      notSatisfied: 2,
      unknown: 3,
      compliancePercent,
      assessedPercent: 70,
    },
    risk: {
      openScoreSum,
      mutedScoreSum: 0,
      counts: {
        open: 0,
        investigating: 0,
        mitigatingPlanned: 0,
        riskAccepted: 0,
        mitigatingImplemented: 0,
      },
    },
    linkage: {
      policies: 0,
      procedures: 0,
      operationalControls: 0,
      unmapped: false,
      unanchored: false,
    },
    hasChildren: false,
    childrenCount: 0,
  };
}

describe('worstFirst', () => {
  it('orders by highest open-risk score first', () => {
    const out = worstFirst([node('a', 5), node('b', 50), node('c', 20)]);
    expect(out.map((n) => n.title)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by lowest compliance percent', () => {
    const out = worstFirst([
      node('a', 10, 90),
      node('b', 10, 10),
      node('c', 10, 50),
    ]);
    expect(out.map((n) => n.title)).toEqual(['b', 'c', 'a']);
  });

  it('is a stable, non-mutating sort', () => {
    const input = [node('a', 1), node('b', 2)];
    const out = worstFirst(input);
    expect(input.map((n) => n.title)).toEqual(['a', 'b']); // input untouched
    expect(out).not.toBe(input);
  });

  it('exposes a page size of 5', () => {
    expect(COLUMN_PAGE_SIZE).toBe(5);
  });
});
