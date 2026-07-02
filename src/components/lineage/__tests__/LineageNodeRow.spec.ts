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
