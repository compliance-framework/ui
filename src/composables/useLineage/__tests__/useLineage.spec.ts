import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LineageNode } from '../types';

// Fake axios instance shared by the mock and the assertions.
const mockGet = vi.fn();
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: mockGet }),
}));

import { useLineage, mapNode } from '../index';

function apiNode(over: Partial<LineageNode> = {}): LineageNode {
  return {
    key: 'control:cat-1/ac-1',
    nodeType: 'control',
    catalogId: 'cat-1',
    controlId: 'ac-1',
    title: 'Access Control',
    compliance: {
      totalControls: 42,
      satisfied: 30,
      notSatisfied: 5,
      unknown: 7,
      compliancePercent: 71.4,
      assessedPercent: 83.3,
    },
    risk: {
      openScoreSum: 37,
      mutedScoreSum: 12,
      counts: {
        open: 3,
        investigating: 1,
        mitigatingPlanned: 0,
        riskAccepted: 1,
        mitigatingImplemented: 1,
      },
    },
    linkage: {
      policies: 2,
      procedures: 1,
      operationalControls: 5,
      unmapped: false,
      unanchored: false,
    },
    hasChildren: true,
    childrenCount: 12,
    ...over,
  };
}

describe('mapNode', () => {
  it('maps an API node to a PrimeVue tree node with leaf derived from hasChildren', () => {
    const tn = mapNode(apiNode());
    expect(tn.key).toBe('control:cat-1/ac-1');
    expect(tn.label).toBe('Access Control');
    expect(tn.type).toBe('control');
    expect(tn.leaf).toBe(false);
    expect(tn.data.risk.openScoreSum).toBe(37);
  });

  it('marks nodes without children as leaves', () => {
    expect(mapNode(apiNode({ hasChildren: false })).leaf).toBe(true);
  });

  it('falls back to controlId then key for the label', () => {
    expect(mapNode(apiNode({ title: '', controlId: 'ac-1' })).label).toBe(
      'ac-1',
    );
    expect(mapNode(apiNode({ title: '', controlId: undefined })).label).toBe(
      'control:cat-1/ac-1',
    );
  });
});

describe('useLineage fetching + caching', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('fetches roots, unwraps DataResponse, and maps to tree nodes', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [apiNode()] } });
    const { fetchRoots, clearCache, usingFixtures } = useLineage();
    clearCache();

    const roots = await fetchRoots({ sspId: 's1', types: ['standard'] });

    expect(mockGet).toHaveBeenCalledWith('/api/lineage/roots', {
      params: { sspId: 's1', types: 'standard' },
    });
    expect(roots).toHaveLength(1);
    expect(roots[0].key).toBe('control:cat-1/ac-1');
    expect(usingFixtures.value).toBe(false);
  });

  it('caches roots per scope so a second call does not refetch', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [apiNode()] } });
    const { fetchRoots, clearCache } = useLineage();
    clearCache();

    await fetchRoots({ sspId: 's-cache' });
    await fetchRoots({ sspId: 's-cache' });

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('URL-encodes the node key when fetching children', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [apiNode({ key: 'child:1', hasChildren: false })] },
    });
    const { fetchChildren, clearCache } = useLineage();
    clearCache();

    await fetchChildren('control:cat-1/ac-1', { sspId: 's2' });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/lineage/nodes/control%3Acat-1%2Fac-1/children',
      { params: { sspId: 's2' } },
    );
  });

  it('falls back to fixtures when the API request fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));
    const { fetchRoots, clearCache, usingFixtures } = useLineage();
    clearCache();

    const roots = await fetchRoots({
      types: ['standard', 'policy', 'procedure'],
    });

    expect(usingFixtures.value).toBe(true);
    expect(roots.length).toBeGreaterThan(0);
  });

  it('flags usingFixtures on a later cache hit populated by an earlier fixture fallback', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));
    const first = useLineage();
    first.clearCache();
    const scope = { sspId: 'prov-1' };
    await first.fetchRoots(scope); // API fails → fixtures cached

    // A fresh consumer (e.g. the graph view) that only hits the cache should
    // still know it is showing demo data.
    const second = useLineage();
    expect(second.usingFixtures.value).toBe(false);
    await second.fetchRoots(scope);

    expect(second.usingFixtures.value).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(1); // served from cache, no refetch
  });

  it('clears the demo-data flag once a live fetch succeeds after a fallback', async () => {
    const api = useLineage();
    api.clearCache();

    // First scope: API down → fixtures, banner on.
    mockGet.mockRejectedValueOnce(new Error('down'));
    await api.fetchRoots({ sspId: 'recover-a' });
    expect(api.usingFixtures.value).toBe(true);

    // Scope change (clears cache + flag) then the API is back → banner off.
    api.clearCache();
    expect(api.usingFixtures.value).toBe(false);
    mockGet.mockResolvedValueOnce({ data: { data: [apiNode()] } });
    await api.fetchRoots({ sspId: 'recover-b' });
    expect(api.usingFixtures.value).toBe(false);
  });
});
