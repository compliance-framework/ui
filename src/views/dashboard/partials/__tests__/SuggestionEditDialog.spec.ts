import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import SuggestionEditDialog from '../SuggestionEditDialog.vue';
import type { DashboardSuggestion } from '../dashboard-suggestions';

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

function makeSuggestion(
  id: string,
  controlId: string,
  overrides: Partial<DashboardSuggestion> = {},
): DashboardSuggestion {
  return {
    id,
    status: 'pending',
    controlId,
    controlCatalogId: 'cat-1',
    labelSetHash: 'hash-1',
    proposedFilterName: 'AI name',
    proposedFilterLabelSet: { env: 'prod' },
    ...overrides,
  };
}

function mountDialog() {
  const group = {
    hash: 'filter:env=prod',
    labels: ['env=prod'],
    suggestions: [
      makeSuggestion('id-1', 'AC-1'),
      makeSuggestion('id-2', 'AC-2'),
    ],
  };
  return mount(SuggestionEditDialog, {
    props: {
      visible: true,
      group,
      controlOptions: [
        { label: 'AC-1', value: 'AC-1', controlId: 'AC-1' },
        { label: 'AC-2', value: 'AC-2', controlId: 'AC-2' },
        { label: 'AC-3', value: 'AC-3', controlId: 'AC-3' },
      ],
      resolveCatalogId: () => 'cat-1',
    },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Message: { template: '<div><slot /></div>' },
        InputText: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
          emits: ['update:modelValue'],
          template: '<div />',
        },
        Checkbox: {
          name: 'Checkbox',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
        PrimaryButton: {
          props: ['disabled'],
          template:
            '<button data-testid="save" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}

describe('SuggestionEditDialog', () => {
  it('emits an edit payload with human-override labels, added and removed controls', async () => {
    const wrapper = mountDialog();

    // Override the label value (env=prod -> env=staging) and the title.
    await wrapper
      .find('[data-testid="edit-label-value-0"]')
      .setValue('staging');
    await wrapper.find('#edit-title').setValue('Staging payments');

    // Remove AC-2 (the second member checkbox).
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[1].setValue(false);

    // Add AC-3 via the MultiSelect.
    wrapper
      .findComponent({ name: 'MultiSelect' })
      .vm.$emit('update:modelValue', ['AC-3']);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-testid="save"]').trigger('click');

    const saved = wrapper.emitted('save');
    expect(saved).toBeTruthy();
    expect(saved?.[0][0]).toEqual({
      ids: ['id-1', 'id-2'],
      proposedFilterName: 'Staging payments',
      proposedFilterLabelSet: { env: 'staging' },
      addControlKeys: ['cat-1:AC-3'],
      removeIds: ['id-2'],
    });
  });
});
