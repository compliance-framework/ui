import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import { CATALOG_TYPE_NS } from '@/composables/catalog';
import CatalogsScreen from '../CatalogsScreen.vue';

const catalogs = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => ({
    data: ref(url ? catalogs.value : undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ put: vi.fn(), delete: vi.fn() }),
}));

vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const catalog = (uuid: string, title: string, props: object[] = []) => ({
  uuid,
  metadata: {
    title,
    version: '1',
    lastModified: '2026-11-02T00:00:00Z',
    props,
  },
});
const prop = (name: string, value: string) => ({
  name,
  value,
  ns: CATALOG_TYPE_NS,
});

async function mountScreen(path = '/catalogs') {
  const Stub = defineComponent({ render: () => h('div') });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/catalogs', name: 'catalog-list', component: CatalogsScreen },
      { path: '/catalogs/create', name: 'catalog-create', component: Stub },
      { path: '/catalogs/:id', name: 'catalog-view', component: Stub },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(CatalogsScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('CatalogsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    catalogs.value = [
      catalog('nist', 'NIST 800-53'),
      catalog('iso', 'ISO 27001', [prop('catalog-active', 'false')]),
      catalog('pol', 'Access policy', [prop('catalog-type', 'policy')]),
    ];
  });

  it('shows standards first, tagging inactive catalogs', async () => {
    const { wrapper } = await mountScreen();
    const rows = wrapper.findAll('tbody tr').map((row) => row.text());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('ISO 27001');
    expect(rows[0]).toContain('Inactive');
    expect(rows[1]).not.toContain('Inactive');
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain(
      'Standards',
    );
  });

  it('selects the type tab from the URL', async () => {
    const { wrapper } = await mountScreen('/catalogs?type=policy');
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain(
      'Policies',
    );
    expect(wrapper.findAll('tbody a').map((a) => a.text())).toEqual([
      'Access policy',
    ]);
  });

  it('counts each tab under the search', async () => {
    const { wrapper } = await mountScreen('/catalogs?q=iso');
    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.text());
    expect(tabs[0]).toContain('1');
    expect(wrapper.text()).toContain('1 catalog match.');
  });
});
