import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { LineageNode } from '@/composables/useLineage/types';

const { fetchRootNodesMock } = vi.hoisted(() => ({
  fetchRootNodesMock: vi.fn(),
}));

vi.mock('@/composables/useLineage', async () => {
  const { ref } = await import('vue');
  return {
    useLineage: () => ({
      fetchRoots: vi.fn(),
      fetchChildren: vi.fn(),
      fetchRootNodes: fetchRootNodesMock,
      fetchChildNodes: vi.fn(),
      clearCache: vi.fn(),
      usingFixtures: ref(false),
    }),
  };
});

import LineageGraphView from '../LineageGraphView.vue';

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
