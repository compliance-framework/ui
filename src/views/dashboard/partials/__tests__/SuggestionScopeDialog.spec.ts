import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SuggestionScopeDialog from '../SuggestionScopeDialog.vue';
import type { DashboardSuggestionLabelKey } from '../dashboard-suggestions';

const state = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  preview: {
    plannedCalls: undefined as number | undefined,
    controlCount: undefined as number | undefined,
    labelSetCount: undefined as number | undefined,
  },
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    post: state.axiosPost,
    get: vi.fn(async () => ({ data: { data: [] } })),
  }),
  decamelizeKeys: (data: unknown) => data,
}));

const labelKeys: DashboardSuggestionLabelKey[] = [
  { key: 'env', values: ['prod', 'stage'] },
  { key: 'provider', values: ['aws'] },
];

function mountDialog(props = {}) {
  return mount(SuggestionScopeDialog, {
    props: {
      visible: true,
      sspId: 'ssp-1',
      controls: [
        {
          label: 'AC-1 - Access control policy',
          value: 'AC-1',
          controlId: 'AC-1',
          title: 'Access control policy',
          catalogTitle: 'NIST SP 800-53 Rev 5',
          profileTitles: ['Moderate Baseline'],
        },
        { label: 'AC-2', value: 'AC-2' },
      ],
      labelKeys,
      ...props,
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Message: { template: '<div><slot /></div>' },
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
          emits: ['update:modelValue'],
          template:
            '<div><div v-for="option in options" :key="option[optionValue]"><slot name="option" :option="option">{{ option[optionLabel] }}</slot></div></div>',
        },
        // Free-text input stub: covers both the scope-preset Select and the
        // editable condition key/value Selects.
        Select: {
          name: 'Select',
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        LabelConditionBuilder: {
          name: 'LabelConditionBuilder',
          props: ['modelValue', 'sspId', 'keys'],
          emits: ['update:modelValue'],
          template: '<div />',
        },
        Checkbox: {
          name: 'Checkbox',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', true)" />',
        },
        PrimaryButton: {
          props: ['disabled'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}

async function flushPreview() {
  await flushPromises();
  await vi.runOnlyPendingTimersAsync();
  await flushPromises();
}

describe('SuggestionScopeDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.preview = {
      plannedCalls: undefined,
      controlCount: undefined,
      labelSetCount: undefined,
    };
    state.axiosPost.mockImplementation(async (_url: string, body: unknown) => {
      const scope = (body as { scope?: { controlKeys?: string[] } })?.scope;
      const controlCount =
        state.preview.controlCount ?? scope?.controlKeys?.length ?? 2;
      const labelSetCount = state.preview.labelSetCount ?? 2;
      return {
        data: {
          data: {
            plannedCalls:
              state.preview.plannedCalls ?? controlCount * labelSetCount,
            controlCount,
            labelSetCount,
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the live cost preview when scope selections change', async () => {
    const wrapper = mountDialog();
    await flushPreview();
    expect(wrapper.text()).toContain('4 AI calls covering 2 controls x 2');

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);
    await flushPreview();

    expect(wrapper.text()).toContain('2 AI calls covering 1 controls x 2');
  });

  it('sends the preview scope through decamelizeKeys so backend keys are kebab-case', async () => {
    const wrapper = mountDialog();
    await flushPreview();

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);
    await flushPreview();

    const lastCall = state.axiosPost.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ scope: { controlKeys: ['AC-1'] } });
    expect(lastCall?.[2]?.transformRequest).toBeDefined();
  });

  it('builds an evidence label filter from conditions in the generate payload', async () => {
    const wrapper = mountDialog();
    await flushPreview();

    // The first LabelConditionBuilder is the "Evidence to analyze" filter.
    wrapper
      .findAllComponents({ name: 'LabelConditionBuilder' })[0]
      .vm.$emit('update:modelValue', [
        { key: 'repository', value: 'todo-app' },
      ]);
    await flushPreview();

    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: {
          labelFilter: {
            scope: {
              condition: {
                label: 'repository',
                operator: '=',
                value: 'todo-app',
              },
            },
          },
        },
        constraints: undefined,
      },
    ]);
  });

  it('requires explicit confirmation for larger grids', async () => {
    state.preview = { plannedCalls: 30, controlCount: 6, labelSetCount: 5 };
    const wrapper = mountDialog({
      controls: Array.from({ length: 6 }, (_, index) => ({
        label: `AC-${index}`,
        value: `AC-${index}`,
      })),
    });
    await flushPreview();

    expect(wrapper.text()).toContain('This will make 30 AI calls');
    expect(
      wrapper.find('[data-testid="scope-generate"]').attributes('disabled'),
    ).toBeDefined();

    await wrapper
      .findAllComponents({ name: 'Checkbox' })[1]
      .vm.$emit('update:modelValue', true);
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      { supersedePending: true, scope: undefined, constraints: undefined },
    ]);
  });

  it('includes label constraints and a scope preset in the generate payload', async () => {
    const wrapper = mountDialog();
    await flushPreview();

    // Pick the "only new filters" preset.
    await wrapper.find('[data-testid="scope-preset"]').setValue('new_filter');
    // Required labels is the 2nd LabelConditionBuilder (evidence is the 1st).
    wrapper
      .findAllComponents({ name: 'LabelConditionBuilder' })[1]
      .vm.$emit('update:modelValue', [{ key: 'env', value: 'prod' }]);
    await flushPreview();

    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
        constraints: {
          onlyAction: 'new_filter',
          mandatoryLabels: [{ key: 'env', value: 'prod' }],
        },
      },
    ]);
  });

  it('treats a blank condition value as a key-only (any value) selector', async () => {
    const wrapper = mountDialog();
    await flushPreview();

    // Excluded labels is the 3rd LabelConditionBuilder.
    wrapper
      .findAllComponents({ name: 'LabelConditionBuilder' })[2]
      .vm.$emit('update:modelValue', [{ key: 'repository', value: '' }]);
    await flushPreview();

    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
        constraints: {
          excludedLabels: [{ key: 'repository', value: null }],
        },
      },
    ]);
  });

  it('surfaces the configured ceiling inline and blocks submission', async () => {
    const wrapper = mountDialog({ ceilingError: 'Maximum is 10 calls' });
    await flushPreview();

    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'Maximum is 10 calls',
    );
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')).toBeUndefined();
  });

  it('emits scope-change when the selected scope changes', async () => {
    const wrapper = mountDialog({ ceilingError: 'Maximum is 10 calls' });
    await flushPreview();

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);

    expect(wrapper.emitted('scope-change')).toBeTruthy();
  });

  it('renders controls with catalog and profile metadata in dropdown options', () => {
    const wrapper = mountDialog();
    const controlSelector = wrapper.findAllComponents({
      name: 'MultiSelect',
    })[0];

    expect(controlSelector.text()).toContain('AC-1 - Access control policy');
    expect(controlSelector.text()).toContain('NIST SP 800-53 Rev 5');
    expect(controlSelector.text()).toContain('Moderate Baseline');
  });

  it('clears the pending preview timer on unmount', async () => {
    const wrapper = mountDialog();

    wrapper.unmount();
    await vi.runOnlyPendingTimersAsync();

    expect(state.axiosPost).not.toHaveBeenCalled();
  });

  it('uses preview planned calls for large-run confirmation instead of local cartesian size', async () => {
    state.preview = { plannedCalls: 1, controlCount: 16, labelSetCount: 89 };
    const wrapper = mountDialog({
      controls: Array.from({ length: 16 }, (_, index) => ({
        label: `AC-${index}`,
        value: `AC-${index}`,
      })),
    });
    await flushPreview();

    expect(wrapper.text()).toContain('1 AI calls covering 16 controls x 89');
    expect(wrapper.find('[data-testid="scope-confirm-large"]').exists()).toBe(
      false,
    );

    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      { supersedePending: true, scope: undefined, constraints: undefined },
    ]);
  });

  it('blocks generation when preview returns an empty resolved scope', async () => {
    state.axiosPost.mockRejectedValueOnce({ response: { status: 422 } });
    const wrapper = mountDialog();
    await flushPreview();

    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'The selected scope does not include any controls or label sets.',
    );
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')).toBeUndefined();
  });
});
