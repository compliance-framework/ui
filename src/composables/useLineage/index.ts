// Data layer for the compliance lineage views. Fetches roots and lazy one-level
// children from the lineage API, caches per key+scope until refresh() or a scope
// change, and maps API nodes to PrimeVue-shaped tree nodes. When the API PoC branch isn't running it transparently
// serves the fixture graph (see fixtures.ts) so both views stay demoable — either
// forced via a flag or as an automatic fallback when a request fails.

import { readonly, ref } from 'vue';
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

// When the data on screen was loaded by the API (its X-Lineage-Generated-At
// header): the oldest response since the cache was last cleared, so the "updated"
// label never claims fresher data than some node shows. Null for fixtures or
// before the first load.
const generatedAt = ref<Date | null>(null);

// Set by refresh(): the next roots request asks the API to rebuild its shared
// cached data, and every later request reuses that rebuild.
let refreshPending = false;

// The API caches one dataset per scope, and the drawer's per-SSP table always reads
// the unscoped one. A refresh in an SSP- or component-scoped view rebuilds only that
// scope, so the drawer's next request rebuilds the unscoped one (see
// takeUnscopedRefresh).
let unscopedRefreshPending = false;

// Bumped by clearCache(). A request captures it before it is sent; if it has
// changed by the time the response arrives, the response predates the clear, so
// it is returned to its caller but kept out of the fresh cache and the data age.
let generation = 0;

/**
 * True once after refresh() if the unscoped lineage data has not been rebuilt
 * since: the caller sends refresh=true with its next unscoped lineage request.
 */
export function takeUnscopedRefresh(): boolean {
  const pending = unscopedRefreshPending;
  unscopedRefreshPending = false;
  return pending;
}

/** Put back a refresh taken by takeUnscopedRefresh() whose request failed. */
export function restoreUnscopedRefresh() {
  unscopedRefreshPending = true;
}

function noteGeneratedAt(headers: unknown) {
  const raw = (headers as Record<string, unknown> | undefined)?.[
    'x-lineage-generated-at'
  ];
  if (typeof raw !== 'string') return;
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return;
  if (!generatedAt.value || at < generatedAt.value) generatedAt.value = at;
}

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
      const gen = generation;
      try {
        const params: Record<string, string> = scopeParams(scope);
        if (refreshPending) params.refresh = 'true';
        const res = await instance.get<DataResponse<LineageNode[]>>(
          '/api/lineage/roots',
          { params },
        );
        if (gen !== generation) return res.data?.data ?? [];
        if (params.refresh && !scope.sspId && !scope.componentId) {
          unscopedRefreshPending = false;
        }
        refreshPending = false;
        noteGeneratedAt(res.headers);
        nodes = res.data?.data ?? [];
        // Live fetch succeeded → we're not on demo data anymore.
        usingFixtures.value = false;
      } catch (err) {
        if (gen !== generation) return fixtureRoots(scope);
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
      const gen = generation;
      try {
        const res = await instance.get<DataResponse<LineageNode[]>>(
          `/api/lineage/nodes/${encodeURIComponent(key)}/children`,
          { params: scopeParams(scope) },
        );
        if (gen !== generation) return res.data?.data ?? [];
        noteGeneratedAt(res.headers);
        nodes = res.data?.data ?? [];
        usingFixtures.value = false;
      } catch (err) {
        if (gen !== generation) return fixtureChildren(key, scope);
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
    generation++;
    cache.clear();
    fixtureCacheKeys.clear();
    generatedAt.value = null;
    // Let the next fetch re-decide; the banner shouldn't stick if the API recovers.
    usingFixtures.value = false;
  }

  /**
   * Drop all cached nodes and have the next roots fetch rebuild the API's shared
   * data, so the view shows current evidence. Call, then reload the roots.
   */
  function refresh() {
    clearCache();
    refreshPending = true;
    unscopedRefreshPending = true;
  }

  return {
    usingFixtures,
    generatedAt: readonly(generatedAt),
    refresh,
    fetchRoots,
    fetchChildren,
    fetchRootNodes: getRoots,
    fetchChildNodes: getChildren,
    mapNode,
    clearCache,
  };
}
