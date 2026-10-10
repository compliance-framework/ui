import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// Hoisted so the (hoisted) vi.mock factory can reference it.
const { fetchRootsMock, fetchChildrenMock } = vi.hoisted(() => ({
  fetchRootsMock: vi.fn(),
  fetchChildrenMock: vi.fn(),
}));

vi.mock('@/composables/useLineage', async () => {
  const { ref } = await import('vue');
  return {
    useLineage: () => ({
      fetchRoots: fetchRootsMock,
      fetchChildren: fetchChildrenMock,
      fetchRootNodes: vi.fn(),
      fetchChildNodes: vi.fn(),
      clearCache: vi.fn(),
      usingFixtures: ref(false),
    }),
  };
});

import LineageTreeView from '../LineageTreeView.vue';
import LineageNodeDrawer from '@/components/lineage/LineageNodeDrawer.vue';
import { useUIStore } from '@/stores/ui';

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

const sampleChildNode = {
  key: 'policy-catalog:child',
  label: 'Child Policy',
  type: 'policy-catalog',
  leaf: true,
  data: {
    ...sampleTreeNode.data,
    key: 'policy-catalog:child',
    title: 'Child Policy',
  },
};

describe('LineageTreeView (smoke)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootsMock.mockReset();
    fetchRootsMock.mockResolvedValue([sampleTreeNode]);
    fetchChildrenMock.mockReset();
    fetchChildrenMock.mockResolvedValue([sampleChildNode]);
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

    expect(wrapper.text()).toContain('Compliance Map');
    expect(fetchRootsMock).toHaveBeenCalledTimes(1);
  });

  it('restores expanded nodes and the selected node/drawer from persisted UI state', async () => {
    const uiStore = useUIStore();
    uiStore.setLineageExpandedKeys({ [sampleTreeNode.key]: true });
    uiStore.setLineageSelectedNodeKey(sampleChildNode.key);
    uiStore.setLineageDrawerOpen(true);

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

    // The previously-expanded root's children are fetched even though this
    // is a fresh component instance (they were never loaded before).
    expect(fetchChildrenMock).toHaveBeenCalledWith(
      sampleTreeNode.key,
      expect.anything(),
    );

    const drawer = wrapper.findComponent(LineageNodeDrawer);
    expect(drawer.props('visible')).toBe(true);
    expect(drawer.props('node')).toMatchObject({ key: sampleChildNode.key });
  });

  it('clears the persisted selection when the drawer is closed', async () => {
    const uiStore = useUIStore();
    uiStore.setLineageSelectedNodeKey(sampleChildNode.key);
    uiStore.setLineageDrawerOpen(true);

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

    // Simulate the drawer closing (e.g. the user dismissing it).
    await wrapper
      .findComponent(LineageNodeDrawer)
      .vm.$emit('update:visible', false);

    expect(uiStore.lineageDrawerOpen).toBe(false);
    expect(uiStore.lineageSelectedNodeKey).toBeNull();
  });
});
