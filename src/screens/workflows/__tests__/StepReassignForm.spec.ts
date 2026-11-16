import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StepReassignForm from '../StepReassignForm.vue';

vi.mock('@/ds/query', () => ({
  useApiQuery: () => ({
    data: ref([{ id: 'user-2', displayName: 'Delegate User' }]),
    status: ref('ready'),
  }),
}));

const stubs = {
  Tooltip: { template: '<slot />' },
  Combobox: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
};

describe('StepReassignForm', () => {
  it('offers the selectable users and submits the chosen one with the reason', async () => {
    setActivePinia(createPinia());
    const wrapper = mount(StepReassignForm, { global: { stubs } });

    expect(wrapper.text()).toContain('Delegate User');
    await wrapper.get('select').setValue('user-2');
    await wrapper.get('textarea').setValue('Out of office');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toEqual([
      [{ userId: 'user-2', reason: 'Out of office' }],
    ]);
  });

  it('shows the error the panel reports', () => {
    setActivePinia(createPinia());
    const wrapper = mount(StepReassignForm, {
      props: { error: 'Choose who to assign it to.' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Choose who to assign it to.');
  });
});
