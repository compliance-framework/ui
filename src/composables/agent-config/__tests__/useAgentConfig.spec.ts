import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { usePermissionsStore } from '@/stores/permissions';
import type { AgentConfigApi } from '../api-types';
import type { AgentInstanceDetail } from '@/types/agent-config';
import {
  configRev6,
  configRev7,
  detailFor,
  instanceIds,
  instancesMixed,
} from '../fixtures';
import { useAgentConfig } from '../useAgentConfig';
import { validationInstanceIds } from '@/utils/agent-config/instance-status';

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
    fixtures: false,
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

  it("loadValidationBases: the validation instances' bases, memoised, failing closed (R61)", async () => {
    store.permissions = { agent: ['read'] };
    store.loaded = true;
    let fail = true;
    const api = makeApi();
    const state = useAgentConfig(ref('agent-1'), api);
    await state.load();
    const ids = validationInstanceIds(instancesMixed.items);
    // The selected instance's detail is already cached: fail another one.
    const failing = ids.find((id) => id !== state.selectedInstanceId.value)!;
    expect(failing).toBeDefined();
    (api.getInstance as ReturnType<typeof vi.fn>).mockClear();
    (api.getInstance as ReturnType<typeof vi.fn>).mockImplementation(
      async (_a: string, id: string) => {
        if (fail && id === failing) throw new Error('boom');
        return detailFor(
          instancesMixed.items.find((i) => i.instanceId === id)!,
          {},
        );
      },
    );
    await expect(state.loadValidationBases()).rejects.toThrow('boom');
    fail = false;
    const bases = await state.loadValidationBases();
    expect(bases).toHaveLength(ids.length);
    const calls = (api.getInstance as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await state.loadValidationBases();
    expect(
      (api.getInstance as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(calls);
    const requested = new Set(
      (api.getInstance as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1]),
    );
    expect([...requested].every((id) => ids.includes(id as string))).toBe(true);
  });
});
