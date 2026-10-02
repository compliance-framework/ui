import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import {
  configRev0,
  configRev6,
  configRev7,
  detailFor,
  instanceDetailA,
  instanceIds,
  instancesMixed,
} from '@/composables/agent-config/__tests__/fixtures';
import type { Agent } from '@/types/agents';
import { ADMIN, READER, globalWith, piniaWith } from './helpers';

const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});

import AgentConfigTab from '../AgentConfigTab.vue';
import AgentConfigHistory from '../AgentConfigHistory.vue';

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

function makeApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return {
    getConfig: vi.fn().mockResolvedValue(configRev7),
    putConfig: vi.fn(),
    preview: vi.fn(),
    listRevisions: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
    getRevision: vi.fn().mockResolvedValue(configRev6),
    revert: vi.fn(),
    listInstances: vi.fn().mockResolvedValue(instancesMixed),
    getInstance: vi.fn().mockImplementation(async (_a: string, id: string) => {
      if (id === instanceIds.a) return instanceDetailA;
      const s = instancesMixed.items.find((i) => i.instanceId === id)!;
      return detailFor(s, {});
    }),
    ...over,
  };
}

function mountTab() {
  return mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(ADMIN)),
  });
}

describe('AgentConfigTab', () => {
  beforeEach(() => {
    api.current = makeApi();
  });

  it('loads, then renders the header, picker, notice and effective view', async () => {
    const wrapper = mountTab();
    expect(wrapper.find('[data-test="config-loading"]').exists()).toBe(true);
    await flushPromises();
    expect(api.current.getConfig).toHaveBeenCalledWith('agent-1');
    expect(api.current.listInstances).toHaveBeenCalledWith('agent-1');
    expect(wrapper.find('[data-test="desired-revision"]').text()).toContain(
      'r7',
    );
    expect(wrapper.find('[data-test="desired-revision"]').text()).toContain(
      'tighten ssh',
    );
    // Default instance = first fresh reported one.
    expect(api.current.getInstance).toHaveBeenCalledWith(
      'agent-1',
      instanceIds.a,
    );
    expect(wrapper.find('[data-test="mode-notice"]').text()).toContain('ip-a');
    expect(wrapper.find('[data-test="effective-view"]').exists()).toBe(true);
    // ip-b is rejected: a problem chip in the header.
    expect(wrapper.find('[data-test="problem-chip"]').text()).toContain('ip-b');
  });

  it('shows the unsupported state on a 404', async () => {
    api.current = makeApi({
      getConfig: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'unsupported',
          status: 404,
          message: 'x',
        }),
      ),
    });
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-test="config-unsupported"]').text()).toContain(
      'does not support agent configuration',
    );
    expect(wrapper.find('[data-test="config-header"]').exists()).toBe(false);
  });

  it('shows an error with Retry', async () => {
    const getConfig = vi
      .fn()
      .mockRejectedValueOnce(
        new AgentConfigApiError({ kind: 'network', message: 'offline' }),
      )
      .mockResolvedValue(configRev7);
    api.current = makeApi({ getConfig });
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-test="config-error"]').text()).toContain(
      'offline',
    );
    await wrapper.find('[data-test="config-error"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="config-header"]').exists()).toBe(true);
  });

  it('handles zero instances: header text, empty effective/file, overlay still works', async () => {
    api.current = makeApi({
      listInstances: vi.fn().mockResolvedValue({
        items: [],
        meta: { desiredRevision: 7, counts: {} },
      }),
    });
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.text()).toContain('No instances have connected yet.');
    expect(wrapper.find('[data-test="instance-picker"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="effective-empty"]').text()).toContain(
      'No configuration reported yet.',
    );
    (
      wrapper.vm as unknown as { $: { setupState: { view: string } } }
    ).$.setupState.view = 'overlay';
    await flushPromises();
    expect(wrapper.find('[data-test="yaml-text"]').text()).toContain(
      'local-ssh-policies:v1.1.0',
    );
  });

  it('hides the picker with one instance, collapses stale instances with more', async () => {
    api.current = makeApi({
      listInstances: vi.fn().mockResolvedValue({
        items: [instancesMixed.items[0]],
        meta: instancesMixed.meta,
      }),
    });
    const one = mountTab();
    await flushPromises();
    expect(one.find('[data-test="instance-picker"]').exists()).toBe(false);

    api.current = makeApi();
    const many = mountTab();
    await flushPromises();
    expect(many.find('[data-test="instance-picker"]').exists()).toBe(true);
    expect(many.find(`[data-test="pick-${instanceIds.d}"]`).exists()).toBe(
      false,
    );
    await many.find('[data-test="toggle-stale"]').trigger('click');
    expect(many.find(`[data-test="pick-${instanceIds.d}"]`).exists()).toBe(
      true,
    );
  });

  it('selecting an instance fetches its detail and the overlay of its applied revision', async () => {
    const wrapper = mountTab();
    await flushPromises();
    await wrapper.find(`[data-test="pick-${instanceIds.f}"]`).trigger('click');
    await flushPromises();
    expect(api.current.getInstance).toHaveBeenLastCalledWith(
      'agent-1',
      instanceIds.f,
    );
    // ip-f runs r6 while r7 is desired: provenance uses r6's overlay.
    expect(api.current.getRevision).toHaveBeenCalledWith('agent-1', 6);
    expect(wrapper.find('[data-test="provenance-note"]').text()).toContain(
      'r6',
    );
  });

  it('revision 0: no overlay saved, copy/download disabled', async () => {
    api.current = makeApi({ getConfig: vi.fn().mockResolvedValue(configRev0) });
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-test="config-header"]').text()).toContain(
      'No overlay saved: agents run their local configuration.',
    );
    (
      wrapper.vm as unknown as { $: { setupState: { view: string } } }
    ).$.setupState.view = 'overlay';
    await flushPromises();
    expect(wrapper.find('[data-test="yaml-empty"]').text()).toBe(
      'No overlay saved yet.',
    );
    expect(
      wrapper.find('[data-test="yaml-copy"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('does not fetch without agent:read', async () => {
    const wrapper = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith({ agent: [] })),
    });
    await flushPromises();
    expect(api.current.getConfig).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="config-error"]').exists()).toBe(true);
  });
  it('readers get no editing UI and load no other instance; editors load every reported instance in the background', async () => {
    const reader = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith(READER)),
    });
    await flushPromises();
    expect(
      reader.find('[data-test="raw-overlay"]').attributes('disabled'),
    ).toBeDefined();
    expect(reader.find('[data-test^="edit-/"]').exists()).toBe(false);
    // Only the selected instance's detail (no background load for readers).
    expect(api.current.getInstance).toHaveBeenCalledTimes(1);

    api.current = makeApi();
    const wrapper = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith(ADMIN)),
    });
    await flushPromises();
    // The selected one plus every other instance with reportedAt (6 of 7; ip-e never
    // reported); the selected one is fetched fresh, the others once.
    expect(api.current.getInstance).toHaveBeenCalledTimes(6);
    expect(
      wrapper.find('[data-test="raw-overlay"]').attributes('disabled'),
    ).toBe(undefined);
    expect(wrapper.find('[data-test="edit-/verbosity"]').exists()).toBe(true);
  });

  it('History may revert only with agent:configure', async () => {
    const cases: [Record<string, string[]>, boolean][] = [
      [ADMIN, true],
      [READER, false],
    ];
    for (const [perms, canRevert] of cases) {
      const wrapper = mount(AgentConfigTab, {
        props: { agent },
        global: globalWith(piniaWith(perms)),
      });
      await flushPromises();
      wrapper
        .findComponent({ name: 'SelectButton' })
        .vm.$emit('update:modelValue', 'history');
      await flushPromises();
      const history = wrapper.findComponent(AgentConfigHistory);
      expect(history.props('canRevert')).toBe(canRevert);
      wrapper.unmount();
    }
  });

  it('never renders client_secret in the File view', async () => {
    api.current = makeApi({
      getInstance: vi
        .fn()
        .mockImplementation(async (_a: string, id: string) => {
          const d = detailFor(
            instancesMixed.items.find((i) => i.instanceId === id)!,
            {},
          );
          d.base = {
            ...d.base!,
            api: {
              url: 'https://x',
              auth: { client_id: 'cid', client_secret: 'LEAKED' },
            },
          };
          return d;
        }),
    });
    const wrapper = mountTab();
    await flushPromises();
    (
      wrapper.vm as unknown as { $: { setupState: { view: string } } }
    ).$.setupState.view = 'file';
    await flushPromises();
    expect(wrapper.find('[data-test="yaml-text"]').text()).toContain(
      'client_id: cid',
    );
    expect(wrapper.html()).not.toContain('LEAKED');
  });
});
