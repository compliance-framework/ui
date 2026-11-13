import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import type { CatalogLinkSummary, ControlLink } from '@/types/control-links';
import ControlLinksScreen from '../ControlLinksScreen.vue';

const state = vi.hoisted(() => ({
  links: [] as ControlLink[],
  catalogLinks: [] as CatalogLinkSummary[],
  deleteControlLink: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url = '') => {
    const data =
      url === '/api/oscal/catalogs'
        ? [
            { uuid: 'cat-1', metadata: { title: 'Standard Catalog' } },
            { uuid: 'cat-2', metadata: { title: 'Policy Catalog' } },
          ]
        : url === '/api/control-links'
          ? state.links
          : url === '/api/control-links/catalog'
            ? state.catalogLinks
            : undefined;
    return {
      data: ref(data),
      isLoading: ref(false),
      execute: vi.fn(async () => ({ data: { value: { data: {} } } })),
    };
  },
}));
vi.mock('@/composables/controlLinks', () => ({
  useControlLinkDelete: () => ({
    deleteControlLink: state.deleteControlLink,
    deleteCatalogLink: vi.fn(),
  }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen(path = '/control-links') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/control-links', component: ControlLinksScreen },
      {
        path: '/control-links/new',
        name: 'control-links-create',
        component: { render: () => null },
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(ControlLinksScreen)),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

describe('ControlLinksScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.deleteControlLink.mockReset();
    state.catalogLinks = [];
    state.links = [
      {
        sourceCatalogId: 'cat-2',
        sourceControlId: 'pol-ac',
        targetCatalogId: 'cat-1',
        targetControlId: 'ac-1',
        relationshipType: 'implements',
      },
    ];
  });

  it('lists links with resolved catalog titles and the relationship', async () => {
    const wrapper = await mountScreen();
    const text = wrapper.find('tbody').text();
    expect(text).toContain('pol-ac');
    expect(text).toContain('Policy Catalog');
    expect(text).toContain('Standard Catalog');
    expect(text).toContain('implements');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
  });

  it('shows the empty state when there are no links', async () => {
    state.links = [];
    const wrapper = await mountScreen();
    expect(wrapper.text()).toContain('No control links yet');
  });

  it('shows catalog-level links with control counts on their tab', async () => {
    state.catalogLinks = [
      {
        sourceCatalogId: 'cat-2',
        targetCatalogId: 'cat-1',
        targetControlId: 'ac-1',
        relationshipType: 'implements',
        controlCount: 7,
      },
    ];
    const wrapper = await mountScreen('/control-links?view=catalog');
    const text = wrapper.find('tbody').text();
    expect(text).toContain('Policy Catalog');
    expect(text).toContain('7');
    const items = wrapper.findComponent(Menu).props('items') as MenuAction[];
    expect(items.map((i) => i.label)).toContain(
      'Re-sync with the source catalog',
    );
  });

  it('deletes a link through the confirming composable', async () => {
    const wrapper = await mountScreen();
    const items = wrapper.findComponent(Menu).props('items') as MenuAction[];
    items.find((i) => i.label === 'Delete link')!.onSelect!();
    expect(state.deleteControlLink).toHaveBeenCalledWith(
      state.links[0],
      'pol-ac implements ac-1',
      expect.any(Function),
    );
  });
});
