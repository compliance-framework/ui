import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import RiskRegisterScreen from '../RiskRegisterScreen.vue';

const state = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([
      { uuid: 's1', metadata: { title: 'Portal' } },
      { uuid: 's2', metadata: { title: 'Payments' } },
    ]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ get: state.get, delete: vi.fn() }),
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/composables/workflows', () => ({
  useUserSearch: () => ({
    loadUsersByIds: vi.fn(),
    getCachedUser: () => undefined,
  }),
}));

const risk = (id: string, title: string, sspId: string) => ({
  id,
  title,
  sspId,
  status: 'open',
});

async function mountScreen(path: string) {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/risks', component: RiskRegisterScreen },
      {
        path: '/systems/:systemId/risks/register',
        component: RiskRegisterScreen,
      },
      {
        path: '/systems/:systemId/risks',
        name: 'system-risks',
        component: Stub,
      },
      {
        path: '/systems/:systemId/risks/register',
        name: 'system-risks-register',
        component: Stub,
      },
      { path: '/risks/:riskId', name: 'risks:detail', component: Stub },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(RiskRegisterScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('RiskRegisterScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    state.get.mockReset();
    state.get.mockResolvedValue({
      data: {
        data: [
          risk('r1', 'Backups untested', 's1'),
          risk('r2', 'Weak TLS', 's2'),
        ],
      },
    });
  });

  it('spans every system at /admin/risks, naming each risk’s system', async () => {
    const wrapper = await mountScreen('/admin/risks');
    expect(state.get).toHaveBeenCalledWith('/api/risks');
    expect(wrapper.find('thead').text()).toContain('System');
    expect(wrapper.find('tbody').text()).toContain('Portal');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    const link = wrapper.find('tbody a');
    expect(link.attributes('href')).not.toContain('from=system');
  });

  it('filters the global register by system from the URL', async () => {
    const wrapper = await mountScreen('/admin/risks?system=s2');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('System: Payments');
  });

  it('reads one system’s risks under /systems/:id', async () => {
    const wrapper = await mountScreen('/systems/s1/risks/register');
    expect(state.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/s1/risks',
    );
    expect(wrapper.find('thead').text()).not.toContain('System');
  });
});
