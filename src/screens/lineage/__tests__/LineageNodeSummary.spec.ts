import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LineageNodeSummary from '../LineageNodeSummary.vue';
import type { LineageNode } from '@/composables/useLineage/types';

function node(compliance: Partial<LineageNode['compliance']>): LineageNode {
  return {
    key: 'control:c/x',
    nodeType: 'control',
    title: 'Example',
    compliance: {
      totalControls: 5,
      satisfied: 5,
      notSatisfied: 0,
      unknown: 0,
      compliancePercent: 100,
      assessedPercent: 100,
      ...compliance,
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
  };
}

const text = (n: LineageNode) =>
  mount(LineageNodeSummary, { props: { node: n } })
    .text()
    .replace(/\s+/g, ' ');

describe('LineageNodeSummary — structural nodes', () => {
  it('says a fully satisfied node with no risk is implemented', () => {
    expect(text(node({}))).toContain('Implemented, no open risk');
  });

  it.each([
    ['unknown controls', { satisfied: 2, unknown: 3, compliancePercent: 100 }],
    ['not-satisfied controls', { satisfied: 4, notSatisfied: 1 }],
    [
      'no controls at all',
      { totalControls: 0, satisfied: 0, compliancePercent: 0 },
    ],
  ])('does not say implemented with %s', (_, compliance) => {
    const t = text(node(compliance));
    expect(t).not.toContain('Implemented, no open risk');
    expect(t).toContain('No open risk (0)');
  });

  it('names open-risk heat in words, with the score', () => {
    const n = node({ satisfied: 4, notSatisfied: 1 });
    n.risk.openScoreSum = 30;
    expect(text(n)).toContain('High open risk (30)');
  });

  it('spells out compliance, including inherited controls only when there are some', () => {
    expect(
      text(node({ totalControls: 5, satisfied: 3, inherited: 2 })),
    ).toContain('3 satisfied, 2 inherited, 0 not satisfied, 0 unknown of 5');
    expect(text(node({ totalControls: 5, satisfied: 5 }))).not.toContain(
      'inherited',
    );
  });
});

describe('LineageNodeSummary — risk & evidence nodes', () => {
  it('shows a risk node with status, severity, score and evidence (no compliance)', () => {
    const t = text({
      ...node({}),
      nodeType: 'risk',
      title: 'A risk',
      status: 'open',
      score: 42,
      severity: 'high',
      linkedEvidenceCount: 3,
      hasChildren: true,
      childrenCount: 3,
    });
    expect(t).toContain('Risk'); // type tag
    expect(t).toContain('Open'); // status badge
    expect(t).toContain('High'); // severity badge
    expect(t).toContain('Score 42 · 3 evidence');
    expect(t).not.toContain('compliant');
  });

  it('shows an evidence node with its state, dates and reason', () => {
    const t = text({
      ...node({}),
      nodeType: 'evidence',
      title: 'Some evidence',
      status: 'not-satisfied',
      reason: 'push protection disabled',
      collectedAt: '2026-07-01T00:00:00Z',
    });
    expect(t).toContain('Evidence'); // type tag
    expect(t).toContain('Not satisfied'); // state badge
    expect(t).toContain('push protection disabled');
    expect(t).toContain('Collected');
  });
});

describe('LineageNodeSummary — inherited leverage', () => {
  it('shows a fully inherited control as Inherited, once, with no warning', () => {
    const t = text({
      ...node({ totalControls: 1, satisfied: 0, inherited: 1 }),
      ssp: {
        posture: 'inherited',
        inProfile: true,
        evidenceStatus: 'unknown',
        leverage: {
          links: 1,
          status: 'active',
          satisfaction: 'full',
          outstandingCount: 0,
          totalResponsibilities: 2,
        },
      },
    });
    expect(t).toContain('Inherited');
    expect(t).not.toContain('Needs evidence');
    expect(t).not.toContain('Inherited · drifted');
  });

  it('flags a drifted-leverage control as needing evidence AND as "Inherited · drifted"', () => {
    const t = text({
      ...node({ totalControls: 1, satisfied: 0, notSatisfied: 0, unknown: 1 }),
      ssp: {
        posture: 'attention',
        inProfile: true,
        evidenceStatus: 'unknown',
        implementationStatus: 'implemented',
        leverage: {
          links: 1,
          status: 'drifted',
          satisfaction: 'partial',
          outstandingCount: 1,
          totalResponsibilities: 2,
        },
      },
    });
    expect(t).toContain('Needs evidence');
    expect(t).toContain('Inherited · drifted');
  });
});
