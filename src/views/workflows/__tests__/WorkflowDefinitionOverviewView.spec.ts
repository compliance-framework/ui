import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowDefinitionOverviewView from '../WorkflowDefinitionOverviewView.vue';
import type { WorkflowDefinition } from '@/types/workflows';

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/stores/workflows/definitions', () => ({
  useWorkflowDefinitionStore: () => ({
    definition: {
      id: 'def-1',
      name: 'Test Workflow',
      description: 'Test description',
      version: '1.0',
      status: 'draft',
      suggestedCadence: 'monthly',
      gracePeriodDays: 7,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as WorkflowDefinition,
    steps: [],
    updateDefinition: vi.fn(),
  }),
}));

vi.mock('@/utils/workflows', () => ({
  DEFAULT_GRACE_PERIOD_DAYS: 7,
  parseGracePeriodInput: vi.fn().mockReturnValue({ value: 7 }),
  toGracePeriodInputValue: vi.fn().mockReturnValue('7'),
  stringifyEvidenceRequired: vi.fn().mockReturnValue('[]'),
  parseEvidenceRequired: vi.fn().mockReturnValue([]),
}));

function mountComponent() {
  return mount(WorkflowDefinitionOverviewView, {
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
// Observed: overview edit form shows a "Required Evidence Types" MultiSelect field
// Expected: overview edit form must not expose a definition-level evidence required field
describe('WorkflowDefinitionOverviewView evidence required field', () => {
  it('does not render a Required Evidence Types field', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).not.toContain('Required Evidence Types');
    expect(wrapper.find('#definition-evidence-required').exists()).toBe(false);
  });
});
