import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import type { Catalog, Group } from '@/oscal';
import { useCollapsibleGroupsStore } from '@/stores/collapsibleGroups';
import CatalogGroupNode from '../CatalogGroupNode.vue';

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      url.endsWith('/groups/ac/controls')
        ? [
            {
              id: 'ac-2',
              title: 'Account management',
              class: 'SP800-53',
              parts: [
                {
                  id: 'ac-2_smt',
                  name: 'statement',
                  prose: 'Manage accounts.',
                },
              ],
            },
          ]
        : [],
    ),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ delete: vi.fn() }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const catalog = { uuid: 'cat-1', metadata: { title: 'NIST' } } as Catalog;
const group = {
  id: 'ac',
  title: 'Access control',
  parts: [{ id: 'ac_ovw', name: 'overview', prose: 'About access.' }],
} as Group;

async function mountTree() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      {
        path: '/catalogs/:catalog/control/:id/evidence',
        name: 'catalog-control-evidence',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/');
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(CatalogGroupNode, { catalog, group })),
    }),
    {
      global: {
        plugins: [router],
        stubs: {
          GroupCreateModal: true,
          ControlCreateModal: true,
          GroupEditModal: true,
          GroupDescriptionModal: true,
          ControlEditModal: true,
          ControlPartEditModal: true,
        },
      },
      attachTo: document.body,
    },
  );
  await flushPromises();
  return wrapper;
}

describe('catalog tree', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('remembers which groups are open', async () => {
    const store = useCollapsibleGroupsStore();
    store.setOpen('catalog:cat-1:group:ac', true);
    const wrapper = await mountTree();
    const groupDisclosure = wrapper.findAllComponents(Disclosure)[0]!;
    expect(groupDisclosure.props('open')).toBe(true);
    groupDisclosure.vm.$emit('update:open', false);
    expect(store.isOpen('catalog:cat-1:group:ac')).toBe(false);
    wrapper.unmount();
  });

  it("shows a group's parts and controls, and a control's statement and evidence link", async () => {
    const wrapper = await mountTree();
    const text = wrapper.text();
    expect(text).toContain('About access.');
    const controlDisclosure = wrapper.findAllComponents(Disclosure)[1]!;
    expect(controlDisclosure.props('label')).toBe('ac-2 · Account management');
    expect(text).toContain('Manage accounts.');
    const controlMenu = wrapper
      .findAllComponents(Menu)
      .find(
        (m) => m.props('label') === 'Actions for ac-2 · Account management',
      )!;
    const labels = (controlMenu.props('items') as MenuAction[]).map(
      (i) => i.label,
    );
    expect(labels).toEqual([
      'Evidence for this control',
      'Edit control',
      'Edit statement',
      'Add objective',
      'Add guidance',
      'Add sub-control',
      'Delete control',
    ]);
    wrapper.unmount();
  });
});
