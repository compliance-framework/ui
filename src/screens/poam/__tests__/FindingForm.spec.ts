import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { Finding } from '@/oscal';
import FindingForm from '../FindingForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'f-9' } } })),
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

describe('FindingForm', () => {
  it('sends an OSCAL target with its status, asking for the target ID first', async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () => h(FindingForm, { poamId: 'p-1' })),
      }),
    );
    const [title, targetId] = wrapper.findAll('input');
    await title!.setValue('SSH exposed');
    await wrapper.find('textarea').setValue('Port 22 open');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter the objective or statement ID');
    await targetId!.setValue('ac-17_obj');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = (api.post.mock.calls[0] as unknown as [string, Finding])[1];
    expect(body.target).toEqual({
      type: 'objective-id',
      targetId: 'ac-17_obj',
      status: { state: 'not-satisfied' },
      implementationStatus: undefined,
    });
    expect(wrapper.findComponent(FindingForm).emitted('created')).toHaveLength(
      1,
    );
  });
});
