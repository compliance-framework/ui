import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { LineageNode } from '@/composables/useLineage/types';

const { fetchRootNodesMock, fetchChildNodesMock } = vi.hoisted(() => ({
  fetchRootNodesMock: vi.fn(),
  fetchChildNodesMock: vi.fn(),
}));

vi.mock('@/composables/useLineage', async () => {
  const { ref } = await import('vue');
  return {
    useLineage: () => ({
      fetchRoots: vi.fn(),
      fetchChildren: vi.fn(),
      fetchRootNodes: fetchRootNodesMock,
      fetchChildNodes: fetchChildNodesMock,
      clearCache: vi.fn(),
      usingFixtures: ref(false),
    }),
  };
});

import LineageGraphView from '../LineageGraphView.vue';
import LineageNodeDrawer from '@/components/lineage/LineageNodeDrawer.vue';
import { useUIStore } from '@/stores/ui';

function baseFields() {
  return {
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
  };
}

function controlNode(title: string): LineageNode {
  return {
    ...baseFields(),
    key: `control:${title}`,
    nodeType: 'control',
    title,
  };
}

function groupNode(title: string, childrenCount: number): LineageNode {
  return {
    ...baseFields(),
    key: `group:${title}`,
    nodeType: 'group',
    title,
    hasChildren: true,
    childrenCount,
  };
}

function riskNode(
  title: string,
  score: number,
  sspId: string,
  sspTitle: string,
): LineageNode {
  return {
    ...baseFields(),
    key: `risk:${title}`,
    nodeType: 'risk',
    title,
    score,
    sspId,
    sspTitle,
  };
}

describe('LineageGraphView risk grouping (smoke)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootNodesMock.mockReset();
    fetchChildNodesMock.mockReset();
  });

  it('buckets risk nodes under an SSP container, leaving structural nodes ungrouped', async () => {
    fetchRootNodesMock.mockResolvedValue([
      controlNode('Access Control'),
      riskNode('Credential leak', 16, 'ssp-1', 'Acme Production'),
      riskNode('Stale access', 42, 'ssp-2', 'Globex Staging'),
    ]);

    const wrapper = mount(LineageGraphView, {
      global: {
        stubs: {
          LineageScopeBar: true,
          LineageViewSwitch: true,
          LineageNodeDrawer: true,
        },
      },
    });

    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('SSP: Acme Production');
    expect(text).toContain('SSP: Globex Staging');
    expect(text).toContain('Access Control');
    expect(text).toContain('Credential leak');
    expect(text).toContain('Stale access');

    // Worst-first: the higher-scored risk's SSP container renders before the other's.
    expect(text.indexOf('SSP: Globex Staging')).toBeLessThan(
      text.indexOf('SSP: Acme Production'),
    );
  });
});

describe('LineageGraphView persisted state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootNodesMock.mockReset();
    fetchChildNodesMock.mockReset();
  });

  it('replays a persisted drill-down path into a fresh column', async () => {
    const root = groupNode('Standards', 1);
    const child = controlNode('Access Control');
    fetchRootNodesMock.mockResolvedValue([root]);
    fetchChildNodesMock.mockResolvedValue([child]);

    const uiStore = useUIStore();
    uiStore.setLineageGraphPath([root.key]);

    const wrapper = mount(LineageGraphView, {
      global: {
        stubs: {
          LineageScopeBar: true,
          LineageViewSwitch: true,
          LineageNodeDrawer: true,
        },
      },
    });

    await flushPromises();

    expect(fetchChildNodesMock).toHaveBeenCalledWith(
      root.key,
      expect.anything(),
    );
    expect(wrapper.text()).toContain('Access Control');
  });

  it('restores the selected node into the drawer from persisted UI state', async () => {
    const node = controlNode('Access Control');
    fetchRootNodesMock.mockResolvedValue([node]);

    const uiStore = useUIStore();
    uiStore.setLineageGraphSelectedNodeKey(node.key);
    uiStore.setLineageGraphDrawerOpen(true);

    const wrapper = mount(LineageGraphView, {
      global: {
        stubs: {
          LineageScopeBar: true,
          LineageViewSwitch: true,
          LineageNodeDrawer: true,
        },
      },
    });

    await flushPromises();

    const drawer = wrapper.findComponent(LineageNodeDrawer);
    expect(drawer.props('visible')).toBe(true);
    expect(drawer.props('node')).toMatchObject({ key: node.key });
  });

  it('clears the persisted selection when the drawer is closed', async () => {
    const node = controlNode('Access Control');
    fetchRootNodesMock.mockResolvedValue([node]);

    const uiStore = useUIStore();
    uiStore.setLineageGraphSelectedNodeKey(node.key);
    uiStore.setLineageGraphDrawerOpen(true);

    const wrapper = mount(LineageGraphView, {
      global: {
        stubs: {
          LineageScopeBar: true,
          LineageViewSwitch: true,
          LineageNodeDrawer: true,
        },
      },
    });

    await flushPromises();

    await wrapper
      .findComponent(LineageNodeDrawer)
      .vm.$emit('update:visible', false);

    expect(uiStore.lineageGraphDrawerOpen).toBe(false);
    expect(uiStore.lineageGraphSelectedNodeKey).toBeNull();
  });
});
