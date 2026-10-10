import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import Select from '@/volt/Select.vue';
import SubjectPicker from '../SubjectPicker.vue';
import type { SubjectSummary } from '@/types/subjects';

const { searchMock, suggestions, unsupported, loadSspsMock, canMock } =
  vi.hoisted(() => ({
    searchMock: vi.fn(),
    suggestions: { value: [] as unknown[] },
    unsupported: { value: false },
    loadSspsMock: vi.fn(),
    canMock: vi.fn<(resource: string, action: string) => boolean>(() => true),
  }));

vi.mock('@/composables/subjects/useSubjectSearch', () => ({
  useSubjectSearch: () => ({
    suggestions: ref(suggestions.value),
    unsupported: ref(unsupported.value),
    search: searchMock,
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => {
    const data = ref<unknown[] | undefined>(undefined);
    loadSspsMock.mockImplementation(async () => {
      data.value = [
        { id: 'ssp-1', metadata: { title: 'Payments Platform' } },
        { id: 'ssp-2' },
      ];
    });
    return { data, execute: loadSspsMock };
  },
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: canMock }),
}));

const firewall: SubjectSummary = {
  subjectUuid: 's-1',
  type: 'component',
  kind: 'system-component',
  title: 'Perimeter Firewall',
  context: 'Payments Platform',
};
const networkTeam: SubjectSummary = {
  subjectUuid: 's-2',
  type: 'party',
  kind: 'party',
  title: 'Network Team',
};

function mountPicker(modelValue: SubjectSummary[] = []) {
  return mount(SubjectPicker, {
    props: { modelValue },
    global: {
      stubs: {
        AutoComplete: {
          props: ['modelValue', 'suggestions', 'invalid'],
          emits: ['update:modelValue', 'complete', 'option-select'],
          template: '<input />',
        },
        Select: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template: '<select />',
        },
        Chip: {
          props: ['label'],
          template: '<span data-testid="chip">{{ label }}</span>',
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

describe('SubjectPicker', () => {
  beforeEach(() => {
    searchMock.mockReset();
    loadSspsMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    suggestions.value = [];
    unsupported.value = false;
  });

  it('offers the SSPs and searches within the chosen one', async () => {
    const wrapper = mountPicker();
    await flushPromises();

    const select = wrapper.findComponent(Select);
    expect(select.props('options')).toEqual([
      { label: 'Payments Platform', value: 'ssp-1' },
      { label: 'ssp-2', value: 'ssp-2' },
    ]);

    await select.vm.$emit('update:modelValue', 'ssp-1');
    wrapper.findComponent(AutoComplete).vm.$emit('complete', { query: 'fire' });

    expect(searchMock).toHaveBeenCalledWith('fire', { ssp: 'ssp-1' });
  });

  it('adds a picked subject once and lists it as selected', async () => {
    const wrapper = mountPicker([firewall]);
    const autoComplete = wrapper.findComponent(AutoComplete);

    autoComplete.vm.$emit('option-select', { value: networkTeam });
    autoComplete.vm.$emit('option-select', { value: firewall });

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [[firewall, networkTeam]],
    ]);
    expect(
      wrapper.findAll('[data-testid="chip"]').map((c) => c.text()),
    ).toEqual(['Perimeter Firewall']);
    expect(wrapper.text()).toContain('+ Add another');
  });

  it('does not offer subjects that are already picked', () => {
    suggestions.value = [firewall, networkTeam];
    const wrapper = mountPicker([firewall]);

    expect(wrapper.findComponent(AutoComplete).props('suggestions')).toEqual([
      networkTeam,
    ]);
  });

  it('removes a selected subject', async () => {
    const wrapper = mountPicker([firewall, networkTeam]);

    await wrapper
      .get('[aria-label="Remove Perimeter Firewall"]')
      .trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[[networkTeam]]]);
  });

  it('neither loads nor offers SSPs without SSP read', () => {
    canMock.mockImplementation(
      (resource: string, action: string) =>
        !(resource === 'ssp' && action === 'read'),
    );
    const wrapper = mountPicker();

    expect(loadSspsMock).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Select).exists()).toBe(false);
    expect(wrapper.findComponent(AutoComplete).exists()).toBe(true);
  });

  it('is hidden when the API does not support subjects', () => {
    unsupported.value = true;
    const wrapper = mountPicker();

    expect(wrapper.find('[data-testid="subject-picker"]').exists()).toBe(false);
  });
});
