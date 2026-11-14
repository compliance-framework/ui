import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref, type Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import PoamLocalDefinitionsTab from '../PoamLocalDefinitionsTab.vue';
import PoamBackMatterTab from '../PoamBackMatterTab.vue';

const responses = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  status: undefined as number | undefined,
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      responses.status ? undefined : responses.data[url.split('/').pop()!],
    ),
    error: ref(
      responses.status ? { response: { status: responses.status } } : undefined,
    ),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ delete: vi.fn() }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountTab(tab: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/plan-of-action-and-milestones/:id', component: tab }],
  });
  await router.push('/plan-of-action-and-milestones/p-1');
  await router.isReady();
  const wrapper = mount(
    defineComponent({ render: () => h(TooltipProvider, null, () => h(tab)) }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('POA&M local definitions and back matter tabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    responses.status = undefined;
  });

  it('treats a 404 as no local definitions yet, offering Add', async () => {
    responses.status = 404;
    const wrapper = await mountTab(PoamLocalDefinitionsTab);
    expect(wrapper.text()).toContain('No local definitions yet');
    expect(wrapper.text()).toContain('Add local definitions');
    wrapper.unmount();
  });

  it('shows other failures as an error with Try again', async () => {
    responses.status = 500;
    const wrapper = await mountTab(PoamLocalDefinitionsTab);
    expect(wrapper.text()).toMatch(/couldn.t load local definitions/i);
    expect(wrapper.text()).toMatch(/try again/i);
    wrapper.unmount();
  });

  it('lists local components, inventory items and remarks, offering Edit', async () => {
    responses.data['local-definitions'] = {
      components: [
        {
          uuid: 'c-1',
          title: 'Bastion host',
          type: 'software',
          status: { state: 'operational' },
        },
      ],
      inventoryItems: [{ uuid: 'i-1', description: 'Laptop fleet' }],
      remarks: 'Scoped to EU',
    };
    const wrapper = await mountTab(PoamLocalDefinitionsTab);
    const text = wrapper.text();
    expect(text).toContain('Bastion host');
    expect(text).toContain('software · operational');
    expect(text).toContain('Laptop fleet');
    expect(text).toContain('Scoped to EU');
    expect(text).toContain('Edit local definitions');
    wrapper.unmount();
  });

  it('shows back matter resources with their citation and links', async () => {
    responses.data['back-matter'] = {
      resources: [
        {
          uuid: 'r-1',
          title: 'Access policy',
          citation: { text: 'Policy 4.2' },
          rlinks: [
            { href: 'https://example.com/policy', mediaType: 'text/html' },
          ],
        },
      ],
    };
    const wrapper = await mountTab(PoamBackMatterTab);
    const disclosure = wrapper.findComponent(Disclosure);
    expect(disclosure.props('label')).toBe('Access policy');
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    expect(wrapper.text()).toContain('Policy 4.2');
    expect(wrapper.find('a[href="https://example.com/policy"]').exists()).toBe(
      true,
    );
    wrapper.unmount();
  });
});
