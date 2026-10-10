import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { usePermissionsStore } from '@/stores/permissions';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AgentConfigApi } from '../api-types';
import { createHttpAgentConfigApi } from '../useAgentConfigApi';
import type { AgentInstanceDetail } from '@/types/agent-config';
import {
  configRev6,
  configRev7,
  detailFor,
  instanceIds,
  instancesMixed,
} from './fixtures';
import { useAgentConfig } from '../useAgentConfig';
import { MAX_INSTANCE_PAGES } from '../instancePages';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return {
    getConfig: vi.fn().mockResolvedValue(configRev7),
    putConfig: vi.fn(),
    preview: vi.fn(),
    listRevisions: vi.fn(),
    getRevision: vi.fn().mockResolvedValue(configRev6),
    revert: vi.fn(),
    listInstances: vi.fn().mockResolvedValue(instancesMixed),
    getInstance: vi
      .fn()
      .mockImplementation(async (_a: string, id: string) =>
        detailFor(instancesMixed.items.find((i) => i.instanceId === id)!, {}),
      ),
    ...over,
  };
}

describe('useAgentConfig', () => {
  let store: ReturnType<typeof usePermissionsStore>;
  beforeEach(() => {
    setActivePinia(createPinia());
    store = usePermissionsStore();
  });

  it('waits for permission hydration and never fetches without agent:read (D-21)', async () => {
    const hydrated = deferred<void>();
    store.hydrate = vi.fn(async () => {
      await hydrated.promise;
      store.permissions = { agent: [] };
      store.loaded = true;
      return store.permissions;
    }) as unknown as typeof store.hydrate;
    const api = makeApi();
    const state = useAgentConfig(ref('agent-1'), api);
    const loading = state.load();
    await Promise.resolve();
    // Optimistic can() would allow it; the composable waits instead.
    expect(api.getConfig).not.toHaveBeenCalled();
    hydrated.resolve();
    await loading;
    expect(api.getConfig).not.toHaveBeenCalled();
    expect(state.status.value).toBe('error');
  });

  it('publishes an instance detail together with its applied overlay; stale selections are dropped', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    const slowB = deferred<AgentInstanceDetail>();
    const api = makeApi({
      getInstance: vi
        .fn()
        .mockImplementation(async (_a: string, id: string) => {
          if (id === instanceIds.b) return slowB.promise;
          return detailFor(
            instancesMixed.items.find((i) => i.instanceId === id)!,
            {},
          );
        }),
    });
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    expect(state.selectedInstance.value?.instanceId).toBe(instanceIds.a);

    const toB = state.selectInstance(instanceIds.b);
    expect(state.selectedInstanceCurrent.value).toBe(false);
    const toF = state.selectInstance(instanceIds.f);
    await toF;
    expect(state.selectedInstance.value?.instanceId).toBe(instanceIds.f);
    // ip-f runs r6: its overlay comes with it.
    expect(state.appliedOverlay.value).toEqual(configRev6.overlay);
    slowB.resolve(detailFor(instancesMixed.items[1], {}));
    await toB;
    // The late ip-b response must not replace the newer selection.
    expect(state.selectedInstance.value?.instanceId).toBe(instanceIds.f);
    expect(state.selectedInstanceCurrent.value).toBe(true);
  });

  it('flags the provenance fallback when the applied revision cannot be loaded', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    const api = makeApi({
      getRevision: vi.fn().mockRejectedValue(new Error('gone')),
    });
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    await state.selectInstance(instanceIds.f);
    expect(state.appliedOverlayFallback.value).toBe(true);
    expect(state.appliedOverlay.value).toEqual(configRev7.overlay);
  });

  it('reports an older API as unsupported even when listInstances 404s first', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    // An older API has neither route: both 404 with no {errors:{body}}.
    const notFound = () => {
      const err = new AxiosError('Not Found', 'ERR_BAD_REQUEST');
      err.response = {
        status: 404,
        data: { message: 'Not Found' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      return err;
    };
    const cfg = deferred<never>();
    const get = vi.fn((url: string) =>
      url.endsWith('/instances') ? Promise.reject(notFound()) : cfg.promise,
    );
    const api = createHttpAgentConfigApi({ get } as never);
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    expect(get).toHaveBeenCalledTimes(2);
    expect(state.status.value).toBe('unsupported');
    cfg.reject(notFound());
  });

  /** `n` copies of ip-a served 25 per page, as the paginated API does. */
  function pagedApi(n: number) {
    const rows = Array.from({ length: n }, (_, i) => ({
      ...instancesMixed.items[0],
      instanceId: `i${i + 1}`,
    }));
    return makeApi({
      listInstances: vi.fn(
        async (_a: string, q: { page?: number; limit?: number } = {}) => {
          const page = q.page ?? 1;
          const limit = q.limit ?? 25;
          return {
            items: rows.slice((page - 1) * limit, page * limit),
            meta: {
              desiredRevision: 7,
              counts: { ...instancesMixed.meta.counts, total: n, inSync: n },
              page,
              limit,
              total: n,
              totalPages: Math.ceil(n / limit),
            },
          };
        },
      ),
    });
  }

  it('loads every page of instances; fleet numbers come from meta.counts', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    const api = pagedApi(60);
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    expect(api.listInstances).toHaveBeenCalledTimes(3);
    expect(state.instances.value).toHaveLength(60);
    expect(state.instancesPartial.value).toBe(false);
    expect(state.instanceTotal.value).toBe(60);
    expect(state.syncSummary.value.inSync).toBe(60);
  });

  it('past the page cap the list is partial; totals still cover the fleet', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    const api = pagedApi(130);
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    expect(api.listInstances).toHaveBeenCalledTimes(MAX_INSTANCE_PAGES);
    expect(state.instances.value).toHaveLength(100);
    expect(state.instancesPartial.value).toBe(true);
    expect(state.instanceTotal.value).toBe(130);
    expect(state.syncSummary.value.total).toBe(130);
    expect(state.syncSummary.value.partial).toBe(true);
  });

  it('ignores the failure of a superseded load', async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    const first = deferred<typeof configRev7>();
    const getConfig = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(configRev7);
    const state = useAgentConfig(ref('agent-1'), makeApi({ getConfig }));
    const a = state.load();
    await Promise.resolve();
    await state.refresh();
    expect(state.status.value).toBe('ready');
    first.reject(new Error('late failure'));
    await a;
    expect(state.status.value).toBe('ready');
  });
});
