import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '../api-types';
import type { AgentInstanceDetail } from '@/types/agent-config';
import { resetAgentDrafts } from '../draftRegistry';
import type { ConfigWorkspace } from '../useConfigWorkspace';
import { clone } from '@/utils/agent-config/merge-patch';
import { getAt } from '@/utils/agent-config/json-pointer';
import {
  ADMIN,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from '@/components/agents/config/__tests__/helpers';
import {
  configRev7,
  detailFor,
  instanceIds,
  instancesMixed,
  overlayRev7,
} from './fixtures';

enableAutoUnmount(afterEach);

const Inner = defineComponent({ render: () => h('div') });

async function mountWorkspace(api: AgentConfigApi) {
  const out: { ws?: ConfigWorkspace } = {};
  mount(
    workspaceHost(api, Inner, () => ({}), out),
    {
      global: globalWith(piniaWith(ADMIN)),
    },
  );
  await flushPromises();
  return out.ws!;
}

const PTR = '/plugins/local-ssh/policy_data/max_auth_tries';
const SCOPE = '/plugins/local-ssh/policy_data';

describe('useConfigWorkspace: edits wait for every instance file', () => {
  beforeEach(() => resetAgentDrafts());

  // ip-a's file has max_auth_tries 4, ip-b's has 6, the saved overlay sets 3. Setting 4 must
  // pin 4 in the overlay (ip-b's file differs); dropping the entry would give ip-b 6.
  function apiWithB(b: () => Promise<AgentInstanceDetail>) {
    const fallback = fakeApi().getInstance;
    return fakeApi({
      getInstance: vi.fn(async (agentId: string, id: string) =>
        id === instanceIds.b ? b() : fallback(agentId, id),
      ),
    });
  }
  const detailB = () => {
    const s = instancesMixed.items.find((i) => i.instanceId === instanceIds.b)!;
    const d = clone(detailFor(s, overlayRev7));
    d.base!.plugins!['local-ssh']!.policy_data = { max_auth_tries: 6 };
    return d;
  };

  it('ip-b still loading: no edits until it loads, then setting ip-a’s file value keeps it pinned', async () => {
    let resolveB!: (d: AgentInstanceDetail) => void;
    const ws = await mountWorkspace(
      apiWithB(() => new Promise<AgentInstanceDetail>((r) => (resolveB = r))),
    );
    expect(ws.detailsLoaded.value).toBe(false); // ip-b still in flight
    expect(ws.canEditPointer(PTR)).toBe(false);
    expect(ws.basesBlockedReason.value).toMatch(/Loading/);
    expect(ws.failedBaseIds.value).toEqual([]);

    resolveB(detailB());
    await flushPromises();
    expect(ws.detailsLoaded.value).toBe(true);
    expect(ws.basesBlockedReason.value).toBe('');
    expect(ws.canEditPointer(PTR)).toBe(true);
    ws.draft.setValue(PTR, 4, SCOPE);
    expect(getAt(ws.draft.overlay.value, PTR)).toBe(4);
  });

  it('ip-b failed to load: no edits, the failure is named, and a retry enables them', async () => {
    let fail = true;
    const ws = await mountWorkspace(
      apiWithB(async () => {
        if (fail) throw new Error('502');
        return detailB();
      }),
    );
    expect(ws.detailsLoaded.value).toBe(true);
    expect(ws.failedBaseIds.value).toEqual([instanceIds.b]);
    expect(ws.canEditPointer(PTR)).toBe(false);
    expect(ws.basesBlockedReason.value).toContain('ip-b');

    fail = false;
    await ws.loadDetails();
    await flushPromises();
    expect(ws.failedBaseIds.value).toEqual([]);
    expect(ws.canEditPointer(PTR)).toBe(true);
    ws.draft.setValue(PTR, 4, SCOPE);
    expect(getAt(ws.draft.overlay.value, PTR)).toBe(4);
  });

  it('control: with ip-b loaded, the value is pinned', async () => {
    const ws = await mountWorkspace(apiWithB(async () => detailB()));
    expect(ws.canEditPointer(PTR)).toBe(true);
    ws.draft.setValue(PTR, 4, SCOPE);
    expect(getAt(ws.draft.overlay.value, PTR)).toBe(4);
  });

  it('a single-instance agent edits as soon as its instance is loaded', async () => {
    const only = instancesMixed.items[0];
    const getInstance = vi.fn(async () => detailFor(only, overlayRev7));
    const ws = await mountWorkspace(
      fakeApi({
        getConfig: vi.fn().mockResolvedValue(configRev7),
        listInstances: vi.fn().mockResolvedValue({
          items: [only],
          meta: {
            ...instancesMixed.meta,
            total: 1,
            counts: { ...instancesMixed.meta.counts, total: 1 },
          },
        }),
        getInstance,
      }),
    );
    expect(ws.basesBlockedReason.value).toBe('');
    expect(ws.canEditPointer(PTR)).toBe(true);
    // The background load reuses the selected instance's detail: one request.
    expect(getInstance).toHaveBeenCalledTimes(1);
    // One page of instances: one list request, and the summary covers the fleet.
    expect(ws.api.listInstances).toHaveBeenCalledTimes(1);
    expect(ws.state.syncSummary.value.partial).toBe(false);
  });

  it('an instance list cut at the page cap blocks edits, naming the cap', async () => {
    // 130 instances (6 pages of 25): only the first 4 pages are loaded.
    const rows = Array.from({ length: 130 }, (_, i) => ({
      ...instancesMixed.items[0],
      instanceId: `i${i + 1}`,
      hostname: `ip-${i + 1}`,
    }));
    const ws = await mountWorkspace(
      fakeApi({
        listInstances: vi.fn(
          async (_a: string, q: { page?: number; limit?: number } = {}) => {
            const page = q.page ?? 1;
            return {
              items: rows.slice((page - 1) * 25, page * 25),
              meta: {
                ...instancesMixed.meta,
                counts: { ...instancesMixed.meta.counts, total: 130 },
                page,
                total: 130,
                totalPages: 6,
              },
            };
          },
        ),
        getInstance: vi.fn(async (_a: string, id: string) => ({
          ...detailFor(instancesMixed.items[0], overlayRev7),
          instanceId: id,
        })),
      }),
    );
    expect(ws.state.instancesPartial.value).toBe(true);
    // Every loaded instance's file is there, yet the rest of the fleet is unknown.
    expect(ws.failedBaseIds.value).toEqual([]);
    expect(ws.canEditPointer(PTR)).toBe(false);
    expect(ws.basesBlockedReason.value).toBe(
      "Only 100 of 130 instances are loaded (at most 100): editing needs every instance's file",
    );
  });
});
