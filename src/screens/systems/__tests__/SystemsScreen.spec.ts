import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import SystemsScreen from '../SystemsScreen.vue';

const plans = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => ({
    data: ref(url ? plans.value : undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const plan = (uuid: string, title: string, lastModified: string) => ({
  uuid,
  metadata: { title, version: '1.0.0', lastModified },
});

async function mountScreen(path = '/systems') {
  const Stub = defineComponent({ render: () => h('div') });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/systems', name: 'systems', component: SystemsScreen },
      {
        path: '/system-security-plans/create',
        name: 'system-security-plans-create',
        component: Stub,
      },
      {
        path: '/system-security-plans/:id',
        name: 'system-security-plan-editor',
        component: Stub,
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(SystemsScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('SystemsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    plans.value = [
      plan('b', 'Payments API', '2026-11-02T00:00:00Z'),
      plan('a', 'Customer Portal', '2026-11-05T00:00:00Z'),
    ];
  });

  it('lists systems by name, linking each to its classic page', async () => {
    const { wrapper } = await mountScreen();
    const links = wrapper.findAll('tbody a');
    expect(links.map((link) => link.text())).toEqual([
      'Customer Portal',
      'Payments API',
    ]);
    expect(links[0]!.attributes('href')).toBe('/system-security-plans/a');
  });

  it('filters by the search in the URL and names the filter when nothing matches', async () => {
    const { wrapper } = await mountScreen('/systems?q=nothing');
    expect(wrapper.text()).toContain('Nothing matches these filters');
    expect(wrapper.text()).toContain('Search: nothing');
  });

  it('writes a new sort to the URL', async () => {
    const { wrapper, router } = await mountScreen();
    const header = wrapper
      .findAll('th button')
      .find((b) => b.text().includes('Last modified'));
    await header!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({
      sort: 'lastModified',
      dir: 'descending',
    });
    expect(wrapper.findAll('tbody a').map((link) => link.text())).toEqual([
      'Customer Portal',
      'Payments API',
    ]);
  });

  it('explains what a system is when there are none', async () => {
    plans.value = [];
    const { wrapper } = await mountScreen();
    expect(wrapper.text()).toContain('No systems yet');
  });
});
