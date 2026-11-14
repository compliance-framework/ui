import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { SystemComponent } from '@/oscal';
import SystemComponentForm from '../SystemComponentForm.vue';

const api = vi.hoisted(() => ({
  put: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'c-1' } } })),
  post: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: () => ({
    data: ref([]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('SystemComponentForm', () => {
  it('saves an edited component with its protocols, dropping empty ones', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const component: SystemComponent = {
      uuid: 'c-1',
      type: 'service',
      title: 'Gateway',
      description: 'Routes traffic',
      purpose: 'Entry',
      status: { state: 'operational' },
      protocols: [
        {
          uuid: 'p-1',
          name: 'https',
          title: '',
          portRanges: [{ transport: 'TCP', start: 443, end: 443 }],
        },
        { uuid: 'p-2', name: '', title: '', portRanges: [] },
      ],
      props: [],
      links: [],
    };
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(SystemComponentForm, { sspId: 'ssp-1', component }),
          ),
      }),
      { attachTo: document.body },
    );
    expect(wrapper.text()).not.toContain('Start from a component definition');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.put.mock.calls[0] as unknown as [
      string,
      SystemComponent,
    ];
    expect(url).toBe(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/components/c-1',
    );
    expect(body.protocols).toHaveLength(1);
    expect(body.protocols![0]).toMatchObject({ name: 'https' });
    expect(
      wrapper.findComponent(SystemComponentForm).emitted('saved'),
    ).toHaveLength(1);
    wrapper.unmount();
  });
});
