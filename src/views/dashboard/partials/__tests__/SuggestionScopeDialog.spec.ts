import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SuggestionScopeDialog from '../SuggestionScopeDialog.vue';
import type { DashboardSuggestionLabelSet } from '../dashboard-suggestions';

function makeLabelSet(hash: string): DashboardSuggestionLabelSet {
  return {
    hash,
    labels: { env: hash },
    evidenceCount: 2,
  };
}

function mountDialog(props = {}) {
  return mount(SuggestionScopeDialog, {
    props: {
      visible: true,
      controls: [
        { label: 'AC-1', value: 'AC-1' },
        { label: 'AC-2', value: 'AC-2' },
      ],
      labelSets: [makeLabelSet('hash-1'), makeLabelSet('hash-2')],
      ...props,
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Message: { template: '<div><slot /></div>' },
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue'],
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

describe('SuggestionScopeDialog', () => {
  it('updates the live cost preview when scope selections change', async () => {
    const wrapper = mountDialog();
    expect(wrapper.text()).toContain('4 AI calls covering 2 controls x 2');

    await wrapper
      .findAllComponents({ name: 'MultiSelect' })[0]
      .vm.$emit('update:modelValue', ['AC-1']);

    expect(wrapper.text()).toContain('2 AI calls covering 1 controls x 2');
  });

  it('requires explicit confirmation for larger grids', async () => {
    const wrapper = mountDialog({
      controls: Array.from({ length: 6 }, (_, index) => ({
        label: `AC-${index}`,
        value: `AC-${index}`,
      })),
      labelSets: Array.from({ length: 5 }, (_, index) =>
        makeLabelSet(`hash-${index}`),
      ),
    });

    expect(wrapper.text()).toContain('This will make 30 AI calls');
    expect(
      wrapper.find('[data-testid="scope-generate"]').attributes('disabled'),
    ).toBeDefined();

    await wrapper
      .findAllComponents({ name: 'Checkbox' })[1]
      .vm.$emit('update:modelValue', true);
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');

    expect(wrapper.emitted('generate')?.at(-1)).toEqual([
      {
        supersedePending: true,
        scope: undefined,
      },
    ]);
  });

  it('surfaces the configured ceiling inline and blocks submission', async () => {
    const wrapper = mountDialog({ ceilingError: 'Maximum is 10 calls' });

    expect(wrapper.find('[data-testid="scope-ceiling"]').text()).toContain(
      'Maximum is 10 calls',
    );
    await wrapper.find('[data-testid="scope-generate"]').trigger('click');
    expect(wrapper.emitted('generate')).toBeUndefined();
  });
});
