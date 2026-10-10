import { describe, it, expect } from 'vitest';
import {
  worstFirst,
  COLUMN_PAGE_SIZE,
  structuralNodes,
  riskGroups,
} from '../ranking';
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

function riskNode(
  title: string,
  score: number,
  sspId?: string,
  sspTitle?: string,
): LineageNode {
  return {
    ...node(title, 0),
    key: `risk:${title}`,
    nodeType: 'risk',
    score,
    sspId,
    sspTitle,
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

describe('structuralNodes', () => {
  it('excludes risk nodes, keeping everything else', () => {
    const out = structuralNodes([
      node('control-a', 5),
      riskNode('risk-a', 10, 'ssp-1', 'SSP One'),
      node('control-b', 5),
    ]);
    expect(out.map((n) => n.title)).toEqual(['control-a', 'control-b']);
  });
});

describe('riskGroups', () => {
  it('buckets risk nodes by sspId, ignoring non-risk nodes', () => {
    const groups = riskGroups([
      node('control-a', 5),
      riskNode('risk-a', 10, 'ssp-1', 'SSP One'),
      riskNode('risk-b', 20, 'ssp-2', 'SSP Two'),
      riskNode('risk-c', 5, 'ssp-1', 'SSP One'),
    ]);
    expect(groups.map((g) => g.sspId)).toEqual(['ssp-2', 'ssp-1']);
    expect(groups[1].nodes.map((n) => n.title)).toEqual(['risk-a', 'risk-c']);
  });

  it('orders groups worst-first by their worst member', () => {
    const groups = riskGroups([
      riskNode('low', 5, 'ssp-low', 'Low'),
      riskNode('high', 50, 'ssp-high', 'High'),
    ]);
    expect(groups.map((g) => g.sspId)).toEqual(['ssp-high', 'ssp-low']);
  });

  it('falls back to "Unknown SSP" when a risk has no sspTitle', () => {
    const groups = riskGroups([riskNode('risk-a', 10, 'ssp-1')]);
    expect(groups[0].sspTitle).toBe('Unknown SSP');
  });

  it('returns an empty array when there are no risk nodes', () => {
    expect(riskGroups([node('control-a', 5)])).toEqual([]);
  });
});
