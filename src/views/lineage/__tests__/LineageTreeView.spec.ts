import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// Hoisted so the (hoisted) vi.mock factory can reference it.
const { fetchRootsMock } = vi.hoisted(() => ({ fetchRootsMock: vi.fn() }));

vi.mock('@/composables/useLineage', async () => {
  const { ref } = await import('vue');
  return {
    useLineage: () => ({
      fetchRoots: fetchRootsMock,
      fetchChildren: vi.fn(),
      fetchRootNodes: vi.fn(),
      fetchChildNodes: vi.fn(),
      clearCache: vi.fn(),
      usingFixtures: ref(false),
    }),
  };
});

import LineageTreeView from '../LineageTreeView.vue';

const sampleTreeNode = {
  key: 'standard-catalog:soc2',
  label: 'SOC 2',
  type: 'standard-catalog',
  leaf: false,
  data: {
    key: 'standard-catalog:soc2',
    nodeType: 'standard-catalog',
    title: 'SOC 2',
    compliance: {
      totalControls: 10,
      satisfied: 6,
      notSatisfied: 2,
      unknown: 2,
      compliancePercent: 60,
      assessedPercent: 80,
    },
    risk: {
      openScoreSum: 12,
      mutedScoreSum: 0,
      counts: {
        open: 1,
        investigating: 0,
        mitigatingPlanned: 0,
        riskAccepted: 0,
        mitigatingImplemented: 0,
      },
    },
    linkage: {
      policies: 1,
      procedures: 0,
      operationalControls: 0,
      unmapped: false,
      unanchored: false,
    },
    hasChildren: true,
    childrenCount: 1,
  },
};

describe('LineageTreeView (smoke)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootsMock.mockReset();
    fetchRootsMock.mockResolvedValue([sampleTreeNode]);
  });

  it('renders the heading and loads roots on mount', async () => {
    const wrapper = mount(LineageTreeView, {
      global: {
        stubs: {
          Tree: true,
          LineageScopeBar: true,
          LineageViewSwitch: true,
          LineageNodeDrawer: true,
          LineageNodeRow: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Compliance Lineage');
    expect(fetchRootsMock).toHaveBeenCalledTimes(1);
  });
});
