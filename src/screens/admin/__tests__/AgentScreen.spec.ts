import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import AgentScreen from '../AgentScreen.vue';

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

const state = vi.hoisted(() => ({ urls: [] as string[], del: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ delete: state.del }),
  useDataApi: (url: string) => {
    state.urls.push(url);
    return {
      data: ref(
        url.endsWith('/keys')
          ? []
          : {
              id: 'agent-1',
              name: 'collector',
              description: 'Collects things',
              isActive: true,
              serviceAccountKeyCount: 1,
              createdAt: '2026-04-06T12:00:00Z',
              updatedAt: '2026-04-06T12:00:00Z',
            },
      ),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      response: ref(undefined),
      execute: vi.fn(() => Promise.resolve()),
    };
  },
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/screens/agents/config/AgentConfigTab.vue', () => ({
  __esModule: true,
  default: {
    name: 'AgentConfigTab',
    props: ['agent'],
    template: '<div data-test="config-tab">{{ agent?.id }}</div>',
  },
}));

const ADMIN = { admin: ['manage'], agent: ['read'] };

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/agents',
        name: 'admin-agents',
        component: { render: () => null },
      },
      {
        path: '/admin/agents/:id',
        component: AgentScreen,
        children: [
          {
            path: '',
            name: 'admin-agent',
            component: () => import('../AgentOverviewTab.vue'),
          },
          {
            path: 'keys',
            name: 'admin-agent-keys',
            component: () => import('../AgentKeysTab.vue'),
          },
          {
            path: 'configuration',
            name: 'admin-agent-configuration',
            component: () => import('../AgentConfigurationTab.vue'),
          },
        ],
      },
    ],
  });
  await router.push(path);
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(RouterView)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

// The tab strip can render its tabs more than once (e.g. a scroll copy), so compare the set.
const tabLabels = (wrapper: ReturnType<typeof mount>) => [
  ...new Set(wrapper.findAll('[role="tab"]').map((t) => t.text())),
];

describe('AgentScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.urls = [];
    state.del.mockReset().mockResolvedValue({});
    perms.map = ADMIN;
    perms.loaded = true;
    perms.hydrate = null;
  });

  it('shows an admin the overview, keys and configuration, with Edit and Delete', async () => {
    const { wrapper } = await mountAt('/admin/agents/agent-1');
    expect(state.urls).toContain('/api/admin/agents/agent-1');
    expect(tabLabels(wrapper)).toEqual(['Overview', 'Keys', 'Configuration']);
    expect(wrapper.text()).toContain('Collects things');
    const buttons = wrapper.findAll('button').map((b) => b.text());
    expect(buttons).toContain('Edit');
    expect(buttons).toContain('Delete');
    wrapper.unmount();
  });

  it('gives a reader the overview and configuration only, and no admin actions', async () => {
    perms.map = { agent: ['read'] };
    const { wrapper } = await mountAt('/admin/agents/agent-1/configuration');
    expect(tabLabels(wrapper)).toEqual(['Overview', 'Configuration']);
    expect(wrapper.find('[data-test="config-tab"]').text()).toBe('agent-1');
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Edit',
    );
    wrapper.unmount();
  });

  it('never requests keys for a reader who follows a link to them (R40)', async () => {
    perms.map = { agent: ['read'] };
    const { wrapper } = await mountAt('/admin/agents/agent-1/keys');
    expect(state.urls.some((u) => u.endsWith('/keys'))).toBe(false);
    wrapper.unmount();
  });

  it('shows no admin UI before permissions hydrate, then shows it to an admin', async () => {
    perms.loaded = false;
    let resolve!: () => void;
    perms.hydrate = () => new Promise<void>((r) => (resolve = r));
    const { wrapper } = await mountAt('/admin/agents/agent-1/keys');
    expect(tabLabels(wrapper)).not.toContain('Keys');
    expect(state.urls.some((u) => u.endsWith('/keys'))).toBe(false);
    resolve();
    await flushPromises();
    expect(tabLabels(wrapper)).toContain('Keys');
    expect(state.urls).toContain('/api/admin/agents/agent-1/keys');
    wrapper.unmount();
  });

  it('deletes the agent after confirming and returns to the list', async () => {
    const { wrapper, router } = await mountAt('/admin/agents/agent-1');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Delete')!
      .trigger('click');
    await flushPromises();
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete agent')!
      .click();
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith('/api/admin/agents/agent-1');
    expect(router.currentRoute.value.name).toBe('admin-agents');
    wrapper.unmount();
  });
});
