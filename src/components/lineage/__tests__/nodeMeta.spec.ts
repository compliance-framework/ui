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
  isRiskMuted,
  isImplemented,
  structuralStyle,
  formatDate,
  postureDisplay,
  postureSegments,
  postureDistribution,
  postureBadge,
  implStatusLabel,
  leverageBadge,
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

  it('a remediated/accepted risk is grayed out, not colored by its score', () => {
    for (const status of [
      'mitigating-implemented',
      'risk-accepted',
      'closed',
    ]) {
      const n = base({ nodeType: 'risk', score: 55, status });
      expect(nodeSwatchClass(n)).toContain('slate');
      expect(nodeSwatchClass(n)).not.toContain('red');
      expect(nodeCardClass(n)).toContain('slate');
    }
  });
});

describe('isRiskMuted', () => {
  it('is true for accepted/mitigated/closed, false for open/investigating', () => {
    expect(isRiskMuted('mitigating-implemented')).toBe(true);
    expect(isRiskMuted('risk-accepted')).toBe(true);
    expect(isRiskMuted('closed')).toBe(true);
    expect(isRiskMuted('open')).toBe(false);
    expect(isRiskMuted('investigating')).toBe(false);
    expect(isRiskMuted(undefined)).toBe(false);
  });
});

describe('structuralStyle / isImplemented', () => {
  const implemented = {
    totalControls: 5,
    satisfied: 5,
    notSatisfied: 0,
    unknown: 0,
    compliancePercent: 100,
    assessedPercent: 100,
  };

  it('is implemented only when fully satisfied with at least one control', () => {
    expect(isImplemented(base({ compliance: implemented }))).toBe(true);
    expect(
      isImplemented(base({ compliance: { ...implemented, unknown: 1 } })),
    ).toBe(false);
    expect(
      isImplemented(base({ compliance: { ...implemented, totalControls: 0 } })),
    ).toBe(false);
  });

  it('implemented + zero open/accepted risk is green (clear)', () => {
    const n = base({ nodeType: 'control', compliance: implemented });
    expect(structuralStyle(n).bucket).toBe('clear');
    expect(nodeSwatchClass(n)).toContain('emerald');
  });

  it('open risk keeps the flame heat even when implemented', () => {
    const n = base({
      nodeType: 'control',
      compliance: implemented,
      risk: { ...base({}).risk, openScoreSum: 30 },
    });
    expect(structuralStyle(n).bucket).toBe('orange');
    expect(nodeSwatchClass(n)).toContain('orange');
  });

  it('only accepted/mitigated risk left is blue (accepted), never green', () => {
    const n = base({
      nodeType: 'group',
      compliance: implemented,
      risk: { ...base({}).risk, openScoreSum: 0, mutedScoreSum: 12 },
    });
    expect(structuralStyle(n).bucket).toBe('accepted');
    expect(nodeSwatchClass(n)).toContain('blue');
    expect(nodeSwatchClass(n)).not.toContain('emerald');
  });

  it('not implemented and no risk stays neutral', () => {
    const n = base({ nodeType: 'control' }); // base has totalControls 0
    expect(structuralStyle(n).bucket).toBe('neutral');
    expect(nodeSwatchClass(n)).toContain('slate');
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

  it('routes risk nodes to the SSP-scoped detail route when an sspId is given', () => {
    expect(
      nodeDetailRoute(base({ nodeType: 'risk', riskId: 'r-1' }), 'ssp-1'),
    ).toEqual({
      name: 'system-security-plan-risk-detail',
      params: { id: 'ssp-1', riskId: 'r-1' },
    });
  });

  it("prefers the risk node's own sspId over the active scope sspId", () => {
    expect(
      nodeDetailRoute(
        base({ nodeType: 'risk', riskId: 'r-1', sspId: 'ssp-own' }),
        'ssp-scope',
      ),
    ).toEqual({
      name: 'system-security-plan-risk-detail',
      params: { id: 'ssp-own', riskId: 'r-1' },
    });
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

describe('postureDisplay', () => {
  it('returns null without an SSP overlay', () => {
    expect(postureDisplay(base({}))).toBeNull();
  });

  it('flags only the attention posture with a warning', () => {
    const d = postureDisplay(
      base({
        ssp: {
          posture: 'attention',
          inProfile: true,
          evidenceStatus: 'unknown',
          implementationStatus: 'implemented',
        },
      }),
    );
    expect(d?.showWarning).toBe(true);
    expect(d?.dim).toBe(false);
    expect(d?.tooltip).toContain('Implemented');
  });

  it('mutes not-applicable and planned (no warning)', () => {
    for (const posture of ['not-applicable', 'planned'] as const) {
      const d = postureDisplay(
        base({ ssp: { posture, inProfile: true, evidenceStatus: 'unknown' } }),
      );
      expect(d?.showWarning).toBe(false);
      expect(d?.dim).toBe(false);
      expect(d?.label).not.toBe('');
    }
  });

  it('dims out-of-scope without a warning', () => {
    const d = postureDisplay(
      base({
        ssp: {
          posture: 'out-of-scope',
          inProfile: false,
          evidenceStatus: 'unknown',
        },
      }),
    );
    expect(d?.dim).toBe(true);
    expect(d?.showWarning).toBe(false);
  });

  it('defers satisfied/not-satisfied to the compliance pill (no chip)', () => {
    expect(
      postureDisplay(
        base({
          ssp: {
            posture: 'satisfied',
            inProfile: true,
            evidenceStatus: 'satisfied',
          },
        }),
      ),
    ).toBeNull();
    expect(
      postureDisplay(
        base({
          ssp: {
            posture: 'not-satisfied',
            inProfile: true,
            evidenceStatus: 'not-satisfied',
          },
        }),
      ),
    ).toBeNull();
  });
});

describe('postureSegments', () => {
  it('keeps only non-empty buckets, in fixed order, labelled for tooltips', () => {
    const segs = postureSegments({
      satisfied: 5,
      attention: 3,
      notSatisfied: 0,
      notApplicable: 2,
      planned: 0,
      outOfScope: 4,
    });
    expect(segs.map((s) => s.key)).toEqual([
      'satisfied',
      'attention',
      'notApplicable',
      'outOfScope',
    ]);
    expect(segs.find((s) => s.key === 'attention')?.label).toBe(
      'need evidence',
    );
  });
});

describe('postureDistribution', () => {
  it('is null when the node carries no distribution', () => {
    expect(postureDistribution(base({}))).toBeNull();
    expect(
      postureDistribution(
        base({
          sspBreakdown: {
            totalSsps: 0,
            outOfScope: 0,
            satisfied: 0,
            notSatisfied: 0,
            notApplicable: 0,
            planned: 0,
            attention: 0,
          },
        }),
      ),
    ).toBeNull();
  });

  it('reads a control cross-SSP breakdown (total = SSP count, in-scope caption)', () => {
    const d = postureDistribution(
      base({
        sspBreakdown: {
          totalSsps: 12,
          outOfScope: 4,
          satisfied: 3,
          notSatisfied: 1,
          notApplicable: 2,
          planned: 1,
          attention: 1,
        },
      }),
    );
    expect(d?.total).toBe(12);
    expect(d?.caption).toBe('8/12 SSPs');
    expect(d?.attention).toBe(1);
    expect(d?.segments.reduce((n, s) => n + s.count, 0)).toBe(12);
  });

  it('aggregates a breakdown of several controls across SSPs (cells = controls × ssps)', () => {
    // "Internal Technical Controls": 3 leaves over 4 SSPs = 12 cells
    // (9 out of scope, 1 not applicable, 1 not satisfied, 1 planned).
    const d = postureDistribution(
      base({
        sspBreakdown: {
          totalSsps: 4,
          outOfScope: 9,
          satisfied: 0,
          notSatisfied: 1,
          notApplicable: 1,
          planned: 1,
          attention: 0,
        },
      }),
    );
    expect(d?.total).toBe(12);
    expect(d?.caption).toBe('3 controls · 4 SSPs');
    expect(d?.segments.reduce((n, s) => n + s.count, 0)).toBe(12);
  });

  it('reads a structural posture tally (total = control count)', () => {
    const d = postureDistribution(
      base({
        postureCounts: {
          satisfied: 5,
          notSatisfied: 1,
          notApplicable: 2,
          planned: 1,
          attention: 3,
          outOfScope: 4,
        },
      }),
    );
    expect(d?.total).toBe(16);
    expect(d?.caption).toBe('16 controls');
    expect(d?.attention).toBe(3);
  });
});

describe('postureBadge', () => {
  it('labels and colours each posture', () => {
    expect(postureBadge('satisfied').class).toContain('emerald');
    expect(postureBadge('not-satisfied').class).toContain('red');
    expect(postureBadge('attention')).toEqual(
      expect.objectContaining({ label: 'Needs evidence' }),
    );
    expect(postureBadge('not-applicable').label).toBe('Not applicable');
    expect(postureBadge('planned').class).toContain('sky');
    expect(postureBadge('out-of-scope').label).toBe('Out of scope');
  });

  it('falls back to the raw value for an unknown posture', () => {
    expect(postureBadge('weird').label).toBe('weird');
    expect(postureBadge(undefined).label).toBe('—');
  });
});

describe('implStatusLabel', () => {
  it('humanises declared statuses and folds case', () => {
    expect(implStatusLabel('not-applicable')).toBe('Not Applicable');
    expect(implStatusLabel('IMPLEMENTED')).toBe('Implemented');
    expect(implStatusLabel('planned')).toBe('Planned');
  });

  it('is undefined for empty/whitespace (undeclared)', () => {
    expect(implStatusLabel('')).toBeUndefined();
    expect(implStatusLabel('   ')).toBeUndefined();
    expect(implStatusLabel(undefined)).toBeUndefined();
  });
});

describe('postureBadge / postureDisplay — inherited', () => {
  it('badges the inherited posture purple', () => {
    expect(postureBadge('inherited')).toEqual(
      expect.objectContaining({ label: 'Inherited' }),
    );
    expect(postureBadge('inherited').class).toContain('purple');
  });

  it('displays an inherited overlay with no warning and no dim', () => {
    const d = postureDisplay(
      base({
        ssp: {
          posture: 'inherited',
          inProfile: true,
          evidenceStatus: 'unknown',
          leverage: {
            links: 1,
            status: 'active',
            satisfaction: 'full',
            outstandingCount: 1,
            totalResponsibilities: 3,
          },
        },
      }),
    );
    expect(d?.label).toBe('Inherited');
    expect(d?.showWarning).toBe(false);
    expect(d?.dim).toBe(false);
    expect(d?.badgeClass).toContain('purple');
    expect(d?.tooltip).toContain('1/3 responsibilities outstanding');
  });

  it('falls back to a generic tooltip when the leverage summary is absent', () => {
    const d = postureDisplay(
      base({
        ssp: {
          posture: 'inherited',
          inProfile: true,
          evidenceStatus: 'unknown',
        },
      }),
    );
    expect(d?.tooltip).toBe('Fully inherited from an upstream SSP');
  });
});

describe('leverageBadge (lineage)', () => {
  it('is null with no leverage or zero links', () => {
    expect(leverageBadge(undefined)).toBeNull();
    expect(
      leverageBadge({
        links: 0,
        status: 'active',
        satisfaction: 'full',
        outstandingCount: 0,
        totalResponsibilities: 0,
      }),
    ).toBeNull();
  });

  it('is plain purple Inherited for an active link', () => {
    const b = leverageBadge({
      links: 1,
      status: 'active',
      satisfaction: 'full',
      outstandingCount: 0,
      totalResponsibilities: 2,
    });
    expect(b?.label).toBe('Inherited');
    expect(b?.class).toContain('purple');
  });

  it('is amber for drifted and slate for revoked', () => {
    expect(
      leverageBadge({
        links: 1,
        status: 'drifted',
        satisfaction: 'partial',
        outstandingCount: 1,
        totalResponsibilities: 2,
      }),
    ).toEqual({
      label: 'Inherited · drifted',
      class: expect.stringContaining('amber'),
    });
    expect(
      leverageBadge({
        links: 1,
        status: 'revoked',
        satisfaction: 'full',
        outstandingCount: 0,
        totalResponsibilities: 2,
      }),
    ).toEqual({
      label: 'Inherited · revoked',
      class: expect.stringContaining('slate'),
    });
  });
});

describe('posture distribution — inherited bucket', () => {
  it('includes an inherited segment in fixed order (after satisfied)', () => {
    const segs = postureSegments({
      satisfied: 2,
      inherited: 3,
      attention: 0,
      notSatisfied: 0,
      notApplicable: 0,
      planned: 0,
      outOfScope: 0,
    });
    expect(segs.map((s) => s.key)).toEqual(['satisfied', 'inherited']);
    expect(segs.find((s) => s.key === 'inherited')?.class).toContain('purple');
  });

  it('counts inherited cells into the breakdown total', () => {
    const d = postureDistribution(
      base({
        sspBreakdown: {
          totalSsps: 4,
          outOfScope: 0,
          satisfied: 1,
          inherited: 2,
          notSatisfied: 0,
          notApplicable: 1,
          planned: 0,
          attention: 0,
        },
      }),
    );
    expect(d?.total).toBe(4);
    expect(d?.segments.find((s) => s.key === 'inherited')?.count).toBe(2);
  });

  it('tolerates a breakdown with no inherited field', () => {
    const d = postureDistribution(
      base({
        postureCounts: {
          satisfied: 2,
          notSatisfied: 1,
          notApplicable: 0,
          planned: 0,
          attention: 0,
          outOfScope: 0,
        },
      }),
    );
    expect(d?.total).toBe(3);
    expect(d?.segments.some((s) => s.key === 'inherited')).toBe(false);
  });
});
