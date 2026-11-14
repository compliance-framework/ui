import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import type { Agent, AgentServiceAccountKey } from '@/types/agents';
import AgentKeysTab from '../AgentKeysTab.vue';

const state = vi.hoisted(() => ({
  keys: [] as AgentServiceAccountKey[],
  urls: [] as string[],
  del: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ delete: state.del }),
  useDataApi: (url: string) => {
    state.urls.push(url);
    return {
      data: ref(state.keys),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      response: ref(undefined),
      execute: vi.fn(() => {
        state.urls.push(url);
        return Promise.resolve();
      }),
    };
  },
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const agent = { id: 'agent-1', name: 'collector' } as Agent;
const key = (
  over: Partial<AgentServiceAccountKey>,
): AgentServiceAccountKey => ({
  id: 'key-1',
  name: 'primary',
  clientId: 'client-id-1',
  neverExpires: true,
  createdAt: '2026-04-06T12:00:00Z',
  updatedAt: '2026-04-06T12:00:00Z',
  ...over,
});

function mountTab() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(AgentKeysTab, { agent })),
    }),
    { attachTo: document.body },
  );
}

describe('AgentKeysTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.urls = [];
    state.del.mockReset().mockResolvedValue({});
    state.keys = [
      key({}),
      key({
        id: 'key-2',
        name: 'old',
        clientId: 'client-id-2',
        revokedAt: '2026-04-07T12:00:00Z',
      }),
      key({
        id: 'key-3',
        name: 'lapsed',
        clientId: 'client-id-3',
        neverExpires: false,
        expiresAt: '2020-01-01T00:00:00Z',
      }),
    ];
  });

  it("lists the agent's keys with their status", () => {
    const wrapper = mountTab();
    expect(state.urls[0]).toBe('/api/admin/agents/agent-1/keys');
    const rows = wrapper.findAll('tbody tr').map((r) => r.text());
    expect(rows[0]).toContain('Active');
    expect(rows[1]).toContain('Revoked');
    expect(rows[2]).toContain('Expired');
    wrapper.unmount();
  });

  it('revokes a key after confirming', async () => {
    const wrapper = mountTab();
    await wrapper
      .findAll('tbody tr')[0]!
      .findAll('button')
      .find((b) => b.text() === 'Revoke')!
      .trigger('click');
    await flushPromises();
    const confirm = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Revoke key',
    )!;
    confirm.click();
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith(
      '/api/admin/agents/agent-1/keys/key-1',
    );
    wrapper.unmount();
  });

  it("doesn't offer to revoke a revoked key", () => {
    const wrapper = mountTab();
    const revoke = wrapper
      .findAll('tbody tr')[1]!
      .findAll('button')
      .find((b) => b.text().startsWith('Revoke'))!;
    expect(revoke.attributes('aria-disabled')).toBe('true');
    wrapper.unmount();
  });
});
