import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowDefinitionCreateForm from '../WorkflowDefinitionCreateForm.vue';

vi.mock('@/composables/workflows', () => ({
  useWorkflowDefinitions: () => ({
    createDefinition: vi.fn(),
  }),
}));

vi.mock('@/utils/workflows', () => ({
  DEFAULT_GRACE_PERIOD_DAYS: 7,
  parseGracePeriodInput: vi.fn().mockReturnValue({ value: 7 }),
  toGracePeriodInputValue: vi.fn().mockReturnValue('7'),
  stringifyEvidenceRequired: vi.fn().mockReturnValue('[]'),
}));

function mountForm() {
  return mount(WorkflowDefinitionCreateForm, {
    global: {
      stubs: {
        Label: { template: '<label><slot /></label>' },
        InputText: {
          props: ['modelValue'],
          template: '<input :value="modelValue" />',
        },
        Textarea: {
          props: ['modelValue'],
          template: '<textarea :value="modelValue" />',
        },
        Select: { template: '<div />' },
        MultiSelect: { template: '<div />' },
        Message: { template: '<div><slot /></div>' },
        PrimaryButton: { template: '<button type="submit"><slot /></button>' },
        SecondaryButton: { template: '<button><slot /></button>' },
      },
    },
  });
}

// BCH-1145: definition-level evidence-required is duplicated and confusing;
// evidence requirements are modelled at step level (EvidenceRequirement[] on each step)
// Observed: create form shows a "Required Evidence Types" MultiSelect field
// Expected: create form must not expose a definition-level evidence required field
describe('WorkflowDefinitionCreateForm evidence required field', () => {
  it('does not render a Required Evidence Types field', () => {
    const wrapper = mountForm();

    expect(wrapper.text()).not.toContain('Required Evidence Types');
    expect(wrapper.find('#definition-create-evidence').exists()).toBe(false);
  });
});
