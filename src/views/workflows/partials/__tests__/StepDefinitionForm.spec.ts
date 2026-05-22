import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import StepDefinitionForm from '../StepDefinitionForm.vue';

vi.mock('@/composables/workflows', () => ({
  useWorkflowStepDefinitions: () => ({
    createStep: vi.fn(),
    updateStep: vi.fn(),
  }),
}));

vi.mock('@/utils/workflows', () => ({
  DEFAULT_GRACE_PERIOD_DAYS: 7,
  parseGracePeriodInput: vi.fn().mockReturnValue({ value: 7 }),
  parseEvidenceRequired: vi.fn().mockReturnValue([]),
  toGracePeriodInputValue: vi.fn().mockReturnValue('7'),
}));

function mountForm() {
  return mount(StepDefinitionForm, {
    props: {
      workflowDefinitionId: 'wf-1',
      availableSteps: [],
    },
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

// BCH-1149: estimatedDuration is not used operationally and should not appear in the form
describe('StepDefinitionForm estimated duration', () => {
  it('does not render an Estimated Duration input field', () => {
    const wrapper = mountForm();

    expect(wrapper.text()).not.toContain('Estimated Duration');
    expect(wrapper.find('#step-duration').exists()).toBe(false);
  });
});
