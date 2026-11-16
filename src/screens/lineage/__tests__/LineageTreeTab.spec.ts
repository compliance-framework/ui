import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// Hoisted so the (hoisted) vi.mock factory can reference it.
const { fetchRootsMock, fetchChildrenMock, refreshMock } = vi.hoisted(() => ({
  fetchRootsMock: vi.fn(),
  fetchChildrenMock: vi.fn(),
  refreshMock: vi.fn(),
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
      refresh: refreshMock,
      generatedAt: ref(null),
      usingFixtures: ref(false),
    }),
  };
});

import LineageTreeTab from '../LineageTreeTab.vue';
import LineageNodeDrawer from '../LineageNodeDrawer.vue';
import LineageScopeFilters from '../LineageScopeFilters.vue';
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

const stubs = {
  LineageScopeFilters: true,
  LineageNodeDrawer: true,
  LineageNodeSummary: true,
  Tooltip: { template: '<slot />' },
};

describe('LineageTreeTab (smoke)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootsMock.mockReset();
    fetchRootsMock.mockResolvedValue([sampleTreeNode]);
    fetchChildrenMock.mockReset();
    fetchChildrenMock.mockResolvedValue([sampleChildNode]);
    refreshMock.mockReset();
  });

  it('loads roots on mount', async () => {
    mount(LineageTreeTab, {
      global: {
        stubs,
      },
    });

    await flushPromises();

    expect(fetchRootsMock).toHaveBeenCalledTimes(1);
  });

  it('restores expanded nodes and the selected node/drawer from persisted UI state', async () => {
    const uiStore = useUIStore();
    uiStore.setLineageExpandedKeys({ [sampleTreeNode.key]: true });
    uiStore.setLineageSelectedNodeKey(sampleChildNode.key);
    uiStore.setLineageDrawerOpen(true);

    const wrapper = mount(LineageTreeTab, {
      global: {
        stubs,
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

    const wrapper = mount(LineageTreeTab, {
      global: {
        stubs,
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

  it('refreshes and reloads the roots, keeping expanded nodes, when the scope bar asks', async () => {
    const uiStore = useUIStore();
    uiStore.setLineageExpandedKeys({ [sampleTreeNode.key]: true });
    // A fresh root per load, as the real composable returns, so each load hydrates.
    fetchRootsMock.mockImplementation(async () => [
      { ...sampleTreeNode, children: undefined },
    ]);

    const wrapper = mount(LineageTreeTab, {
      global: {
        stubs,
      },
    });
    await flushPromises();
    expect(fetchRootsMock).toHaveBeenCalledTimes(1);
    expect(fetchChildrenMock).toHaveBeenCalledTimes(1);

    wrapper.findComponent(LineageScopeFilters).vm.$emit('refresh');
    await flushPromises();

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(fetchRootsMock).toHaveBeenCalledTimes(2);
    expect(fetchChildrenMock).toHaveBeenCalledTimes(2);
  });

  it("loads a node's children the first time it opens, and remembers it is open", async () => {
    const uiStore = useUIStore();
    fetchRootsMock.mockResolvedValue([
      { ...sampleTreeNode, children: undefined },
    ]);
    const wrapper = mount(LineageTreeTab, { global: { stubs } });
    await flushPromises();
    expect(fetchChildrenMock).not.toHaveBeenCalled();

    const toggle = wrapper.get('button[aria-label="Expand SOC 2"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    await toggle.trigger('click');
    await flushPromises();

    expect(fetchChildrenMock).toHaveBeenCalledWith(
      sampleTreeNode.key,
      expect.anything(),
    );
    expect(uiStore.lineageExpandedKeys).toEqual({ [sampleTreeNode.key]: true });
    expect(
      wrapper
        .get('button[aria-label="Collapse SOC 2"]')
        .attributes('aria-expanded'),
    ).toBe('true');
    expect(
      wrapper.find('button[aria-label="Details for Child Policy"]').exists(),
    ).toBe(true);
  });

  it('opens the drawer for a structural node from its Details button', async () => {
    const uiStore = useUIStore();
    const wrapper = mount(LineageTreeTab, { global: { stubs } });
    await flushPromises();

    await wrapper
      .get('button[aria-label="Details for SOC 2"]')
      .trigger('click');

    expect(uiStore.lineageDrawerOpen).toBe(true);
    expect(
      wrapper.findComponent(LineageNodeDrawer).props('node'),
    ).toMatchObject({ key: sampleTreeNode.key });
  });
});
