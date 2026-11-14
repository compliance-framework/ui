import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import InventoryScreen from '../InventoryScreen.vue';

const state = vi.hoisted(() => ({ urls: [] as string[] }));
vi.mock('@/composables/axios', () => {
  return {
    useDataApi: (url: string) => {
      state.urls.push(url);
      return {
        data: ref([
          {
            uuid: 'i-1',
            description: '',
            source: 'Payments plan',
            sourceId: 'ssp-1',
            sourceType: 'ssp',
            props: [
              { name: 'asset-id', value: 'db-01' },
              { name: 'asset-type', value: 'database' },
            ],
          },
          {
            uuid: 'i-2',
            description: '',
            source: 'Evidence Collection',
            sourceId: 'ev',
            sourceType: 'evidence',
            props: [{ name: 'name', value: 'payments-service' }],
          },
        ]),
        error: ref(undefined),
        isLoading: ref(false),
        isFinished: ref(true),
        response: ref(undefined),
        execute: vi.fn((next: string) => {
          state.urls.push(next);
          return Promise.resolve();
        }),
      };
    },
    useAuthenticatedInstance: () => ({ delete: vi.fn() }),
  };
});
vi.mock('@/stores/system', () => ({
  useSystemStore: () => ({ system: { securityPlan: { uuid: 'ssp-1' } } }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen(path = '/inventory') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/inventory', component: InventoryScreen }],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(InventoryScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

const menuFor = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper
    .findAllComponents(Menu)
    .find((m) => m.props('label') === `Actions for ${name}`)!
    .props('items') as MenuAction[];

describe('InventoryScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.urls.length = 0;
  });

  it('asks for the default sources, naming items by asset id or name prop', async () => {
    const { wrapper } = await mountScreen();
    expect(state.urls[0]).toBe(
      '/api/oscal/inventory?include_ssp=true&include_evidence=true&include_poam=true&include_ap=false&include_ar=false',
    );
    expect(wrapper.text()).toContain('db-01');
    expect(wrapper.text()).toContain('payments-service');
    wrapper.unmount();
  });

  it('reads sources and type from the address and fetches again when they change', async () => {
    const { wrapper, router } = await mountScreen(
      '/inventory?sources=evidence&type=database',
    );
    expect(state.urls[0]).toContain('include_ssp=false&include_evidence=true');
    expect(state.urls[0]).toContain('item_type=database');
    expect(wrapper.text()).toContain('Type: Database');
    await router.push('/inventory');
    await flushPromises();
    expect(state.urls.at(-1)).not.toContain('item_type');
    wrapper.unmount();
  });

  it("only lets this system's plan items be changed", async () => {
    const { wrapper } = await mountScreen();
    const own = menuFor(wrapper, 'db-01');
    const evidence = menuFor(wrapper, 'payments-service');
    expect(own.find((i) => i.label === 'Edit item')!.disabledReason).toBe(
      undefined,
    );
    expect(
      evidence.find((i) => i.label === 'Delete item')!.disabledReason,
    ).toContain("Only items in this system's security plan");
    wrapper.unmount();
  });
});
