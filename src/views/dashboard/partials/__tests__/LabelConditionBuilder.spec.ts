import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import LabelConditionBuilder from '../LabelConditionBuilder.vue';

const state = vi.hoisted(() => ({
  axiosGet: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: state.axiosGet }),
}));

// Host with a real v-model so writes between keystrokes sync, mirroring the
// dialog's usage of the component.
function mountBuilder(initial: { key: string; value: string }[] = []) {
  const rows = ref(initial);
  const Host = defineComponent({
    components: { LabelConditionBuilder },
    setup() {
      return { rows };
    },
    template:
      '<LabelConditionBuilder v-model="rows" ssp-id="ssp-1" :keys="[\'repository\',\'env\']" />',
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        AutoComplete: {
          name: 'AutoComplete',
          props: ['modelValue', 'suggestions'],
          emits: ['update:modelValue', 'complete'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
  return { wrapper, rows };
}

describe('LabelConditionBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.axiosGet.mockResolvedValue({
      data: { data: ['todo-app', 'todo-worker'] },
    });
  });

  it('adds a row and captures free-typed key/value (no cap)', async () => {
    const { wrapper, rows } = mountBuilder();

    await wrapper.find('[data-testid="add-condition"]').trigger('click');
    expect(rows.value).toEqual([{ key: '', value: '' }]);

    const inputs = wrapper.find('[data-testid="condition-0"]').findAll('input');
    await inputs[0].setValue('repository');
    await inputs[1].setValue('todo-app');

    expect(rows.value).toEqual([{ key: 'repository', value: 'todo-app' }]);
  });

  it('searches values server-side for the row key', async () => {
    const { wrapper } = mountBuilder([{ key: 'repository', value: '' }]);

    const valueInput = wrapper
      .find('[data-testid="condition-0"]')
      .findAllComponents({ name: 'AutoComplete' })[1];
    valueInput.vm.$emit('complete', { query: 'todo' });
    await flushPromises();

    expect(state.axiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions/label-values'),
      { params: { key: 'repository', query: 'todo' } },
    );
  });

  it('removes a row', async () => {
    const { wrapper, rows } = mountBuilder([
      { key: 'env', value: 'prod' },
      { key: 'repository', value: 'todo-app' },
    ]);

    await wrapper.find('[data-testid="condition-0"] button').trigger('click');
    expect(rows.value).toEqual([{ key: 'repository', value: 'todo-app' }]);
  });
});
