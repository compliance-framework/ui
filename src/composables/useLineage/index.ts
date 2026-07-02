// Data layer for the compliance lineage views. Fetches roots and lazy one-level
// children from the lineage API, caches per key+scope, and maps API nodes to
// PrimeVue-shaped tree nodes. When the API PoC branch isn't running it transparently
// serves the fixture graph (see fixtures.ts) so both views stay demoable — either
// forced via a flag or as an automatic fallback when a request fails.

import { ref } from 'vue';
import type { AxiosInstance } from 'axios';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import { fixtureChildren, fixtureRoots } from './fixtures';
import type { LineageNode, LineageScope, LineageTreeNode } from './types';

export type { LineageNode, LineageScope, LineageTreeNode } from './types';

// Module-level cache shared across every useLineage() consumer (tree, graph,
// dashboard widget) so navigating between views doesn't refetch.
const cache = new Map<string, LineageNode[]>();

// Cache keys whose value came from fixtures (not the API). Lets a later consumer
// that only hits the cache (e.g. the graph after the tree already populated it)
// still know it's showing demo data and surface the banner.
const fixtureCacheKeys = new Set<string>();

function scopeKey(scope: LineageScope): string {
  const types = (scope.types ?? []).slice().sort().join(',');
  return `${scope.sspId ?? ''}|${scope.componentId ?? ''}|${types}`;
}

function rootsCacheKey(scope: LineageScope): string {
  return `${scopeKey(scope)}§roots`;
}

function childrenCacheKey(key: string, scope: LineageScope): string {
  return `${scopeKey(scope)}§${key}`;
}

function scopeParams(scope: LineageScope): Record<string, string> {
  const params: Record<string, string> = {};
  if (scope.sspId) params.sspId = scope.sspId;
  if (scope.componentId) params.componentId = scope.componentId;
  if (scope.types && scope.types.length) params.types = scope.types.join(',');
  return params;
}

/** True when fixtures are explicitly requested (env flag, query param, or toggle). */
function fixturesForced(): boolean {
  if (import.meta.env.VITE_LINEAGE_FIXTURES === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('fixtures') === '1')
      return true;
    if (window.localStorage.getItem('lineageFixtures') === '1') return true;
  } catch {
    /* access to location/localStorage can throw in some sandboxes */
  }
  return false;
}

/** Map an API node to a PrimeVue tree node. `leaf` is derived from `hasChildren`. */
export function mapNode(node: LineageNode): LineageTreeNode {
  return {
    key: node.key,
    label: node.title || node.controlId || node.key,
    type: node.nodeType,
    leaf: !node.hasChildren,
    data: node,
    children: undefined,
  };
}

export function useLineage() {
  // Must be created in setup context (injects config/auth/router/toast).
  const instance: AxiosInstance = useAuthenticatedInstance();
  const usingFixtures = ref(false);

  async function getRoots(scope: LineageScope): Promise<LineageNode[]> {
    const ck = rootsCacheKey(scope);
    const cached = cache.get(ck);
    if (cached) {
      if (fixtureCacheKeys.has(ck)) usingFixtures.value = true;
      return cached;
    }

    let nodes: LineageNode[];
    if (fixturesForced()) {
      usingFixtures.value = true;
      fixtureCacheKeys.add(ck);
      nodes = fixtureRoots(scope);
    } else {
      try {
        const res = await instance.get<DataResponse<LineageNode[]>>(
          '/api/lineage/roots',
          {
            params: scopeParams(scope),
          },
        );
        nodes = res.data?.data ?? [];
      } catch (err) {
        // API unavailable → keep the demo alive with fixtures.
        console.warn('[useLineage] roots fetch failed, using fixtures', err);
        usingFixtures.value = true;
        fixtureCacheKeys.add(ck);
        nodes = fixtureRoots(scope);
      }
    }
    cache.set(ck, nodes);
    return nodes;
  }

  async function getChildren(
    key: string,
    scope: LineageScope,
  ): Promise<LineageNode[]> {
    const ck = childrenCacheKey(key, scope);
    const cached = cache.get(ck);
    if (cached) {
      if (fixtureCacheKeys.has(ck)) usingFixtures.value = true;
      return cached;
    }

    let nodes: LineageNode[];
    if (fixturesForced() || usingFixtures.value) {
      usingFixtures.value = true;
      fixtureCacheKeys.add(ck);
      nodes = fixtureChildren(key, scope);
    } else {
      try {
        const res = await instance.get<DataResponse<LineageNode[]>>(
          `/api/lineage/nodes/${encodeURIComponent(key)}/children`,
          { params: scopeParams(scope) },
        );
        nodes = res.data?.data ?? [];
      } catch (err) {
        console.warn('[useLineage] children fetch failed, using fixtures', err);
        usingFixtures.value = true;
        fixtureCacheKeys.add(ck);
        nodes = fixtureChildren(key, scope);
      }
    }
    cache.set(ck, nodes);
    return nodes;
  }

  /** Roots as fresh tree nodes (safe to mutate `.children` per view). */
  async function fetchRoots(scope: LineageScope): Promise<LineageTreeNode[]> {
    return (await getRoots(scope)).map(mapNode);
  }

  /** One level of children as fresh tree nodes. */
  async function fetchChildren(
    key: string,
    scope: LineageScope,
  ): Promise<LineageTreeNode[]> {
    return (await getChildren(key, scope)).map(mapNode);
  }

  /** Drop all cached nodes — call when scope changes so views refetch. */
  function clearCache() {
    cache.clear();
    fixtureCacheKeys.clear();
  }

  return {
    usingFixtures,
    fetchRoots,
    fetchChildren,
    fetchRootNodes: getRoots,
    fetchChildNodes: getChildren,
    mapNode,
    clearCache,
  };
}
