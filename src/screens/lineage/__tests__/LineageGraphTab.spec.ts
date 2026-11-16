import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { LineageNode } from '@/composables/useLineage/types';

const { fetchRootNodesMock, fetchChildNodesMock, refreshMock } = vi.hoisted(
  () => ({
    fetchRootNodesMock: vi.fn(),
    fetchChildNodesMock: vi.fn(),
    refreshMock: vi.fn(),
  }),
);

vi.mock('@/composables/useLineage', async () => {
  const { ref } = await import('vue');
  return {
    useLineage: () => ({
      fetchRoots: vi.fn(),
      fetchChildren: vi.fn(),
      fetchRootNodes: fetchRootNodesMock,
      fetchChildNodes: fetchChildNodesMock,
      clearCache: vi.fn(),
      refresh: refreshMock,
      generatedAt: ref(null),
      usingFixtures: ref(false),
    }),
  };
});

import LineageGraphTab from '../LineageGraphTab.vue';
import LineageNodeDrawer from '../LineageNodeDrawer.vue';
import LineageScopeFilters from '../LineageScopeFilters.vue';
import { useUIStore } from '@/stores/ui';

const stubs = {
  LineageScopeFilters: true,
  LineageNodeDrawer: true,
  Tooltip: { template: '<slot />' },
};

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

describe('LineageGraphTab risk grouping (smoke)', () => {
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

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
      },
    });

    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Risks in Acme Production');
    expect(text).toContain('Risks in Globex Staging');
    expect(text).toContain('Access Control');
    expect(text).toContain('Credential leak');
    expect(text).toContain('Stale access');

    // Worst-first: the higher-scored risk's SSP container renders before the other's.
    expect(text.indexOf('Risks in Globex Staging')).toBeLessThan(
      text.indexOf('Risks in Acme Production'),
    );
  });
});

describe('LineageGraphTab persisted state', () => {
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

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
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

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
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

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
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

describe('LineageGraphTab column collapse', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootNodesMock.mockReset();
    fetchChildNodesMock.mockReset();
  });

  it("hiding an open node's children closes its column instead of reopening it", async () => {
    const root = groupNode('Standards', 1);
    const child = controlNode('Access Control');
    fetchRootNodesMock.mockResolvedValue([root]);
    fetchChildNodesMock.mockResolvedValue([child]);

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
      },
    });
    await flushPromises();

    await wrapper.get('button[aria-expanded="false"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Access Control');
    expect(fetchChildNodesMock).toHaveBeenCalledTimes(1);

    // Hiding the open node's children closes the column it opened, without re-fetching.
    const hide = wrapper.get('button[aria-expanded="true"]');
    expect(hide.text()).toBe('Hide children');
    await hide.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Access Control');
    expect(fetchChildNodesMock).toHaveBeenCalledTimes(1);
  });
});

describe('LineageGraphTab refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchRootNodesMock.mockReset();
    fetchChildNodesMock.mockReset();
    refreshMock.mockReset();
  });

  it('refreshes, replays the drill-down path, and stays busy until the replay is done', async () => {
    const root = groupNode('Standards', 1);
    fetchRootNodesMock.mockImplementation(async () => [{ ...root }]);
    fetchChildNodesMock.mockResolvedValue([controlNode('Access Control')]);
    useUIStore().setLineageGraphPath([root.key]);

    const wrapper = mount(LineageGraphTab, {
      global: {
        stubs,
      },
    });
    await flushPromises();
    expect(fetchChildNodesMock).toHaveBeenCalledTimes(1);

    // Hold the replayed column's children so the reload is caught mid-replay.
    let releaseChildren: (() => void) | undefined;
    fetchChildNodesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseChildren = () => resolve([controlNode('Access Control v2')]);
        }),
    );

    const bar = wrapper.findComponent(LineageScopeFilters);
    bar.vm.$emit('refresh');
    await flushPromises();

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(fetchRootNodesMock).toHaveBeenCalledTimes(2);
    expect(fetchChildNodesMock).toHaveBeenCalledTimes(2);
    expect(bar.props('refreshing')).toBe(true);

    releaseChildren!();
    await flushPromises();

    expect(bar.props('refreshing')).toBe(false);
    expect(wrapper.text()).toContain('Access Control v2');
  });
});
