import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import type { Agent } from '@/types/agents';
import AgentsScreen from '../AgentsScreen.vue';

const perms = vi.hoisted(() => ({
  map: {} as Record<string, string[]>,
  loaded: true,
  hydrate: null as null | (() => Promise<unknown>),
}));
vi.mock('@/composables/usePermissions', async () => {
  const { computed, ref } = await import('vue');
  return {
    usePermissions: () => {
      const loaded = ref(perms.loaded);
      const can = (resource: string, action: string) =>
        !loaded.value || (perms.map[resource]?.includes(action) ?? false);
      return {
        can,
        canManageAdmin: computed(() => can('admin', 'manage')),
        loaded,
        hydrate: async () => {
          await perms.hydrate?.();
          loaded.value = true;
        },
      };
    },
  };
});

const state = vi.hoisted(() => ({
  agents: [] as Agent[],
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: state.post }),
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: () => ({
    data: ref(state.agents),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const agent = (over: Partial<Agent>): Agent => ({
  id: 'agent-1',
  name: 'collector',
  description: 'Collects evidence',
  isActive: true,
  serviceAccountKeyCount: 1,
  lastAuthenticatedAt: '2026-04-06T13:00:00Z',
  createdAt: '2026-04-06T12:00:00Z',
  updatedAt: '2026-04-06T12:00:00Z',
  ...over,
});

async function mountList() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/agents', name: 'admin-agents', component: AgentsScreen },
      {
        path: '/admin/agents/:id',
        name: 'admin-agent',
        component: { render: () => null },
      },
      {
        path: '/admin/agents/:id/keys',
        name: 'admin-agent-keys',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/admin/agents');
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(RouterView)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('AgentsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    perms.map = { admin: ['manage'], agent: ['read'] };
    perms.loaded = true;
    perms.hydrate = null;
    state.agents = [
      agent({}),
      agent({
        id: 'agent-2',
        name: 'backup',
        isActive: false,
        lastAuthenticatedAt: null,
      }),
    ];
    state.post.mockReset().mockResolvedValue({
      data: { data: agent({ id: 'agent-3', name: 'new' }) },
    });
  });

  it('lists the agents, each linking to its page', async () => {
    const { wrapper } = await mountList();
    const rows = wrapper.findAll('tbody tr').map((r) => r.text());
    expect(rows[0]).toContain('backup');
    expect(rows[0]).toContain('Inactive');
    expect(rows[0]).toContain('Never');
    expect(rows[1]).toContain('collector');
    expect(wrapper.find('a[href="/admin/agents/agent-1"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows the empty state when there are no agents', async () => {
    state.agents = [];
    const { wrapper } = await mountList();
    expect(wrapper.text()).toContain('No agents yet');
    wrapper.unmount();
  });

  it('registers an agent and opens its keys', async () => {
    const { wrapper, router } = await mountList();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Register agent')!
      .trigger('click');
    await flushPromises();
    const name = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input',
    )!;
    name.value = 'new';
    name.dispatchEvent(new Event('input'));
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')!
      .dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(state.post.mock.calls[0]![0]).toBe('/api/admin/agents');
    expect(state.post.mock.calls[0]![1]).toMatchObject({
      name: 'new',
      isActive: true,
    });
    expect(router.currentRoute.value.name).toBe('admin-agent-keys');
    expect(router.currentRoute.value.params.id).toBe('agent-3');
    wrapper.unmount();
  });

  it("doesn't offer registration to a reader, even before permissions hydrate (R40)", async () => {
    perms.map = { agent: ['read'] };
    perms.loaded = false;
    let resolve!: () => void;
    perms.hydrate = () => new Promise<void>((r) => (resolve = r));
    const { wrapper } = await mountList();
    const has = () =>
      wrapper.findAll('button').some((b) => b.text() === 'Register agent');
    expect(has()).toBe(false);
    resolve();
    await flushPromises();
    expect(has()).toBe(false);
    wrapper.unmount();
  });
});
