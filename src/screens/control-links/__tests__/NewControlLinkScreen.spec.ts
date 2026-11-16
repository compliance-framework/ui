import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import NewControlLinkScreen from '../NewControlLinkScreen.vue';

const calls = vi.hoisted(
  () => ({}) as Record<string, ReturnType<typeof vi.fn>>,
);

vi.mock('@/composables/axios', () => ({
  useDataApi: (url = '') => {
    const execute = vi.fn(async () => ({ data: { value: { data: {} } } }));
    calls[String(url)] = execute;
    return {
      execute,
      data: ref(
        url === '/api/oscal/catalogs'
          ? [
              { uuid: 'cat-1', metadata: { title: 'Standard Catalog' } },
              { uuid: 'cat-2', metadata: { title: 'Policy Catalog' } },
            ]
          : undefined,
      ),
    };
  },
}));
vi.mock('@/composables/useControlOptions', () => ({
  useControlOptions: () => ({
    options: ref([
      { label: 'ac-1 · Access Control', value: 'ac-1' },
      { label: 'ac-2 · Account Management', value: 'ac-2' },
    ]),
    loading: ref(false),
  }),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/control-links/new', component: NewControlLinkScreen },
      {
        path: '/control-links',
        name: 'control-links-list',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/control-links/new');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(NewControlLinkScreen)),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return { wrapper, router };
}

/** Comboboxes in page order: source catalog, (source control,) target catalog, (target control). */
async function choose(wrapper: VueWrapper, index: number, value: string) {
  wrapper
    .findAllComponents(Combobox)
    [index]!.vm.$emit('update:modelValue', value);
  await flushPromises();
}
async function relationship(wrapper: VueWrapper, value: string) {
  wrapper.findComponent(Select).vm.$emit('update:modelValue', value);
  await flushPromises();
}

describe('NewControlLinkScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const key of Object.keys(calls)) delete calls[key];
  });

  it('names every missing field and skips the POST', async () => {
    const { wrapper } = await mountScreen();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose the source catalog.');
    expect(wrapper.text()).toContain('Choose a relationship.');
    expect(wrapper.text()).toContain('Choose the target catalog.');
    expect(calls['/api/control-links']).not.toHaveBeenCalled();
  });

  it('POSTs a source, target and relationship for a single control', async () => {
    const { wrapper, router } = await mountScreen();
    await choose(wrapper, 0, 'cat-1');
    await choose(wrapper, 1, 'ac-1');
    await relationship(wrapper, 'implements');
    await choose(wrapper, 2, 'cat-2');
    await choose(wrapper, 3, 'ac-2');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(calls['/api/control-links']).toHaveBeenCalledWith({
      method: 'POST',
      data: {
        source: { catalogId: 'cat-1', controlId: 'ac-1' },
        target: { catalogId: 'cat-2', controlId: 'ac-2' },
        relationshipType: 'implements',
      },
    });
    expect(router.currentRoute.value.fullPath).toBe('/control-links');
  });

  it('rejects linking a control to itself', async () => {
    const { wrapper } = await mountScreen();
    await choose(wrapper, 0, 'cat-1');
    await choose(wrapper, 1, 'ac-1');
    await relationship(wrapper, 'implements');
    await choose(wrapper, 2, 'cat-1');
    await choose(wrapper, 3, 'ac-1');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain("A control can't be linked to itself.");
    expect(calls['/api/control-links']).not.toHaveBeenCalled();
  });

  it('links a whole catalog without a source control', async () => {
    const { wrapper } = await mountScreen();
    wrapper.findComponent(RadioGroup).vm.$emit('update:modelValue', 'catalog');
    await flushPromises();
    await choose(wrapper, 0, 'cat-2');
    expect(wrapper.findAllComponents(Combobox)).toHaveLength(2);
    await relationship(wrapper, 'implements');
    await choose(wrapper, 1, 'cat-1');
    await choose(wrapper, 2, 'ac-1');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(calls['/api/control-links/catalog']).toHaveBeenCalledWith({
      method: 'POST',
      data: {
        sourceCatalogId: 'cat-2',
        target: { catalogId: 'cat-1', controlId: 'ac-1' },
        relationshipType: 'implements',
      },
    });
  });
});
