import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import LeveragedAuthorizationForm from '../LeveragedAuthorizationForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'la-9' } } })),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: () => ({
    data: ref([{ uuid: 'p-1', name: 'Cloud provider', type: 'organization' }]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('LeveragedAuthorizationForm', () => {
  it('asks for title, party and date, then adds the authorization', async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(LeveragedAuthorizationForm, { sspId: 'ssp-1' }),
          ),
      }),
      { attachTo: document.body },
    );
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose the party that granted it.');
    const party = wrapper.findComponent(Combobox);
    expect(party.props('options')).toEqual([
      { value: 'p-1', label: 'Cloud provider' },
    ]);
    await wrapper.find('input').setValue('Cloud ATO');
    party.vm.$emit('update:modelValue', 'p-1');
    await wrapper.find('input[type="date"]').setValue('2026-03-01');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/leveraged-authorizations',
    );
    expect(body).toMatchObject({
      title: 'Cloud ATO',
      partyUuid: 'p-1',
      dateAuthorized: '2026-03-01',
    });
    expect(
      wrapper.findComponent(LeveragedAuthorizationForm).emitted('created'),
    ).toHaveLength(1);
    wrapper.unmount();
  });
});
