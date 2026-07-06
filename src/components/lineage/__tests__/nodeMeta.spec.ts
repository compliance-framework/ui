import { describe, it, expect } from 'vitest';
import {
  nodeKind,
  nodeHeatScore,
  nodeRankScore,
  evidenceBadness,
  evidenceStateBadge,
  riskStatusBadge,
  severityBadge,
  nodeSwatchClass,
  nodeCardClass,
  nodeDetailRoute,
  formatDate,
} from '../nodeMeta';
import type { LineageNode } from '@/composables/useLineage/types';

function base(over: Partial<LineageNode>): LineageNode {
  return {
    key: 'k',
    nodeType: 'control',
    title: 't',
    compliance: {
      totalControls: 0,
      satisfied: 0,
      notSatisfied: 0,
      unknown: 0,
      compliancePercent: 0,
      assessedPercent: 0,
    },
    risk: {
      openScoreSum: 0,
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
    ...over,
  };
}

describe('nodeKind', () => {
  it('classifies risk, evidence, and structural nodes', () => {
    expect(nodeKind(base({ nodeType: 'risk' }))).toBe('risk');
    expect(nodeKind(base({ nodeType: 'evidence' }))).toBe('evidence');
    expect(nodeKind(base({ nodeType: 'control' }))).toBe('structural');
  });
});

describe('nodeHeatScore / nodeRankScore', () => {
  it('risk nodes use score', () => {
    const n = base({ nodeType: 'risk', score: 42 });
    expect(nodeHeatScore(n)).toBe(42);
    expect(nodeRankScore(n)).toBe(42);
  });

  it('structural nodes use aggregate open risk', () => {
    const n = base({ risk: { ...base({}).risk, openScoreSum: 30 } });
    expect(nodeHeatScore(n)).toBe(30);
    expect(nodeRankScore(n)).toBe(30);
  });

  it('evidence ranks failing states worst', () => {
    expect(
      nodeRankScore(base({ nodeType: 'evidence', status: 'not-satisfied' })),
    ).toBe(100);
    expect(
      nodeRankScore(base({ nodeType: 'evidence', status: 'unknown' })),
    ).toBe(50);
    expect(
      nodeRankScore(base({ nodeType: 'evidence', status: 'satisfied' })),
    ).toBe(0);
  });
});

describe('evidenceBadness', () => {
  it('scores failing/unknown/passing states', () => {
    expect(evidenceBadness('not-satisfied')).toBe(100);
    expect(evidenceBadness('failed')).toBe(100);
    expect(evidenceBadness('satisfied')).toBe(0);
    expect(evidenceBadness('pass')).toBe(0);
    expect(evidenceBadness('pending')).toBe(50);
    expect(evidenceBadness(undefined)).toBe(50);
  });
});

describe('badges', () => {
  it('evidence state badge colours by state', () => {
    expect(evidenceStateBadge('not-satisfied').class).toContain('red');
    expect(evidenceStateBadge('satisfied').class).toContain('emerald');
    expect(evidenceStateBadge('unknown').class).toContain('slate');
  });

  it('risk status badge colours open red, investigating amber', () => {
    expect(riskStatusBadge('open').class).toContain('red');
    expect(riskStatusBadge('investigating').class).toContain('amber');
  });

  it('severity badge derives from score when severity is absent', () => {
    expect(severityBadge(base({ nodeType: 'risk', score: 60 }))?.label).toBe(
      'critical',
    );
    expect(severityBadge(base({ nodeType: 'risk', score: 5 }))?.label).toBe(
      'low',
    );
  });

  it('severity badge prefers an explicit severity', () => {
    expect(
      severityBadge(base({ nodeType: 'risk', score: 5, severity: 'high' }))
        ?.label,
    ).toBe('high');
  });
});

describe('swatch / card classes', () => {
  it('evidence not-satisfied is red, satisfied is emerald', () => {
    expect(
      nodeSwatchClass(base({ nodeType: 'evidence', status: 'not-satisfied' })),
    ).toContain('red');
    expect(
      nodeCardClass(base({ nodeType: 'evidence', status: 'satisfied' })),
    ).toContain('emerald');
  });

  it('risk uses heat from score', () => {
    expect(nodeCardClass(base({ nodeType: 'risk', score: 55 }))).toContain(
      'red',
    );
  });
});

describe('nodeDetailRoute', () => {
  it('routes risk nodes to risks:detail with riskId', () => {
    expect(nodeDetailRoute(base({ nodeType: 'risk', riskId: 'r-1' }))).toEqual({
      name: 'risks:detail',
      params: { riskId: 'r-1' },
    });
  });

  it('falls back to the id encoded in the key', () => {
    expect(
      nodeDetailRoute(base({ nodeType: 'risk', key: 'risk:r-2', riskId: '' })),
    ).toEqual({ name: 'risks:detail', params: { riskId: 'r-2' } });
  });

  it('routes evidence nodes to evidence:view with the evidenceId', () => {
    expect(
      nodeDetailRoute(base({ nodeType: 'evidence', evidenceId: 'e-1' })),
    ).toEqual({ name: 'evidence:view', params: { id: 'e-1' } });
  });

  it('never uses the (stream) key as the evidence id — returns null without evidenceId', () => {
    expect(
      nodeDetailRoute(
        base({
          nodeType: 'evidence',
          key: 'evidence:stream-uuid',
          evidenceId: '',
        }),
      ),
    ).toBeNull();
  });

  it('returns null for structural nodes', () => {
    expect(nodeDetailRoute(base({ nodeType: 'control' }))).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats valid ISO and rejects missing/invalid', () => {
    expect(formatDate('2026-07-01T09:00:00Z')).toContain('2026');
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('not-a-date')).toBeNull();
  });
});
