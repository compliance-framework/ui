import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LineageNodeRow from '../LineageNodeRow.vue';
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

// v-tooltip is a global directive registered in main.ts; stub it for the test.
const global = { directives: { tooltip: {} } };

describe('LineageNodeRow — fully-compliant green pill', () => {
  it('paints the compliance pill green when every control is satisfied', () => {
    const wrapper = mount(LineageNodeRow, {
      props: {
        node: node({
          totalControls: 5,
          satisfied: 5,
          notSatisfied: 0,
          unknown: 0,
        }),
      },
      global,
    });
    expect(wrapper.html()).toContain('bg-emerald-100');
  });

  it('does not paint green when there are unknown controls', () => {
    const wrapper = mount(LineageNodeRow, {
      props: {
        node: node({
          totalControls: 5,
          satisfied: 2,
          notSatisfied: 0,
          unknown: 3,
          compliancePercent: 100,
        }),
      },
      global,
    });
    expect(wrapper.html()).not.toContain('bg-emerald-100');
  });

  it('does not paint green when there are not-satisfied controls', () => {
    const wrapper = mount(LineageNodeRow, {
      props: {
        node: node({
          totalControls: 5,
          satisfied: 4,
          notSatisfied: 1,
          unknown: 0,
        }),
      },
      global,
    });
    expect(wrapper.html()).not.toContain('bg-emerald-100');
  });

  it('does not paint green when there are no controls at all', () => {
    const wrapper = mount(LineageNodeRow, {
      props: {
        node: node({
          totalControls: 0,
          satisfied: 0,
          notSatisfied: 0,
          unknown: 0,
          compliancePercent: 0,
        }),
      },
      global,
    });
    expect(wrapper.html()).not.toContain('bg-emerald-100');
  });
});

describe('LineageNodeRow — risk & evidence nodes', () => {
  it('renders a risk node with status, severity and score (no compliance pill)', () => {
    const riskNode: LineageNode = {
      ...node({}),
      nodeType: 'risk',
      title: 'A risk',
      status: 'open',
      score: 42,
      severity: 'high',
      linkedEvidenceCount: 3,
      hasChildren: true,
      childrenCount: 3,
    };
    const html = mount(LineageNodeRow, {
      props: { node: riskNode, card: true },
      global,
    }).html();
    expect(html).toContain('Risk'); // type tag
    expect(html).toContain('open'); // status badge
    expect(html).toContain('high'); // severity badge
    expect(html).toContain('score 42');
    expect(html).toContain('3 evidence');
    expect(html).not.toContain('bg-emerald-100'); // no structural green pill
  });

  it('renders an evidence node with its state and reason', () => {
    const evidenceNode: LineageNode = {
      ...node({}),
      nodeType: 'evidence',
      title: 'Some evidence',
      status: 'not-satisfied',
      reason: 'push protection disabled',
      collectedAt: '2026-07-01T00:00:00Z',
    };
    const html = mount(LineageNodeRow, {
      props: { node: evidenceNode, card: true },
      global,
    }).html();
    expect(html).toContain('Evidence'); // type tag
    expect(html).toContain('not-satisfied'); // state badge
    expect(html).toContain('push protection disabled'); // reason
    expect(html).toContain('collected');
  });
});
