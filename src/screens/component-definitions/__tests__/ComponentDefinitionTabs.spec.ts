import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref, type Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import ComponentDefinitionComponentsTab from '../ComponentDefinitionComponentsTab.vue';
import ComponentDefinitionCapabilitiesTab from '../ComponentDefinitionCapabilitiesTab.vue';

const COMPONENTS = [
  {
    uuid: 'c-1',
    type: 'software',
    title: 'Ingress gateway',
    description: 'Routes traffic',
    purpose: 'Entry point',
  },
];
const CAPABILITIES = [
  {
    uuid: 'cap-1',
    name: 'Encrypted transit',
    description: 'TLS everywhere',
    incorporatesComponents: [
      { componentUuid: 'c-1', description: 'Terminates TLS' },
    ],
    controlImplementations: [
      {
        uuid: 'ci-1',
        source: '#nist-800-53',
        description: 'SC family',
        implementedRequirements: [{}, {}],
      },
    ],
  },
];

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(url.endsWith('/capabilities') ? CAPABILITIES : COMPONENTS),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountTab(tab: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/component-definitions/:id', component: tab }],
  });
  await router.push('/component-definitions/cd-1');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(tab)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('ComponentDefinitionComponentsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.get.mockReset().mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'ci-1',
            source: '#nist-800-53',
            description: 'AC family',
            implementedRequirements: [{}],
          },
        ],
      },
    });
  });

  it('lists components and loads their control implementations', async () => {
    const wrapper = await mountTab(ComponentDefinitionComponentsTab);
    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/component-definitions/cd-1/components/c-1/control-implementations',
    );
    const disclosure = wrapper.findComponent(Disclosure);
    expect(disclosure.props('label')).toBe('Ingress gateway');
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Entry point');
    expect(text).toContain('#nist-800-53');
    expect(text).toContain('1 requirement');
    wrapper.unmount();
  });
});

describe('ComponentDefinitionCapabilitiesTab', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('names incorporated components by title and counts requirements', async () => {
    const wrapper = await mountTab(ComponentDefinitionCapabilitiesTab);
    const disclosure = wrapper.findComponent(Disclosure);
    expect(disclosure.props('label')).toBe('Encrypted transit');
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Ingress gateway');
    expect(text).toContain('Terminates TLS');
    expect(text).toContain('2 requirements');
    wrapper.unmount();
  });
});
