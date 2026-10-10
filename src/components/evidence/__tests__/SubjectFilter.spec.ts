import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import SubjectFilter from '../SubjectFilter.vue';

const { unsupported } = vi.hoisted(() => ({ unsupported: { value: false } }));

vi.mock('@/composables/subjects/useSubjectSearch', () => ({
  useSubjectSearch: () => ({
    suggestions: ref([]),
    unsupported: ref(unsupported.value),
    search: vi.fn(),
  }),
}));

const subject = {
  subjectUuid: 's-1',
  type: 'component',
  kind: 'system-component' as const,
  title: 'Perimeter Firewall',
  context: 'Payments Platform',
};

function mountFilter(modelValue: typeof subject | null = null) {
  return mount(SubjectFilter, {
    props: { modelValue },
    global: {
      stubs: {
        AutoComplete: {
          props: ['modelValue', 'placeholder'],
          emits: ['update:modelValue', 'complete'],
          template: '<input :placeholder="placeholder" />',
        },
        TertiaryButton: {
          emits: ['click'],
          template:
            '<button type="button" @click="$emit(\'click\')"><slot /></button>',
        },
        BIconX: { template: '<span />' },
      },
    },
  });
}

describe('SubjectFilter', () => {
  it('shows "Subject: any" until a subject is picked', () => {
    const wrapper = mountFilter();

    expect(wrapper.get('input').attributes('placeholder')).toBe('Subject: any');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('emits the picked subject, ignoring text typed in between', async () => {
    const wrapper = mountFilter();
    const autoComplete = wrapper.findComponent(AutoComplete);

    autoComplete.vm.$emit('update:modelValue', 'Perim');
    autoComplete.vm.$emit('update:modelValue', subject);
    autoComplete.vm.$emit('update:modelValue', '');

    expect(wrapper.emitted('update:modelValue')).toEqual([[subject], [null]]);
  });

  it('clears the filter', async () => {
    const wrapper = mountFilter(subject);

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
  });

  it('is hidden when the API does not support subjects', () => {
    unsupported.value = true;
    const wrapper = mountFilter();

    expect(wrapper.find('input').exists()).toBe(false);
    unsupported.value = false;
  });
});
