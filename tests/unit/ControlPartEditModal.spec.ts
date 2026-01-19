import { shallowMount } from '@vue/test-utils';
import ControlPartEditModal from '@/components/catalogs/ControlPartEditModal.vue';
import { vi, describe, it, expect } from 'vitest';
vi.mock('primevue/usetoast', () => {
  return {
    useToast: () => ({ add: vi.fn() }),
  };
});

vi.mock('@/composables/axios', () => {
  return {
    useDataApi: () => ({
      execute: async () => ({
        data: { value: { data: { id: 'C-1', title: 't' } } },
      }),
    }),
  };
});

const catalog = { uuid: 'TEST-CAT', metadata: { title: 't' } } as any;
const control = { id: 'C-1', title: 'c', parts: [] } as any;

describe('ControlPartEditModal', () => {
  it('submits and emits updated', async () => {
    const wrapper = shallowMount(ControlPartEditModal, {
      props: { catalog, control, type: 'statement' },
      global: {
        stubs: {
          Dialog: true,
          FormInput: true,
          PrimaryButton: true,
        },
      },
    });
    await wrapper.setProps({ modelValue: true });
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.emitted().updated).toBeTruthy();
  });
});
