import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowDefinitionStepsView from '../WorkflowDefinitionStepsView.vue';
import type { StepDefinition, WorkflowDefinition } from '@/types/workflows';

vi.mock('@/stores/workflows/definitions', () => ({
  useWorkflowDefinitionStore: () => ({
    definition: {
      id: 'def-1',
      name: 'Test Workflow',
      gracePeriodDays: 7,
    } as WorkflowDefinition,
    steps: [
      {
        id: 'step-1',
        workflowDefinitionId: 'def-1',
        name: 'Review Access',
        order: 3,
        evidenceRequired: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ] as StepDefinition[],
    addStepLocally: vi.fn(),
    updateStepLocally: vi.fn(),
    removeStepLocally: vi.fn(),
  }),
}));

vi.mock('@/composables/workflows', () => ({
  useWorkflowStepDefinitions: () => ({
    deleteStep: vi.fn(),
  }),
}));

vi.mock('@/utils/workflows', () => ({
  hasEvidenceRequirement: () => false,
}));

function mountComponent() {
  return mount(WorkflowDefinitionStepsView, {
    global: {
      stubs: {
        PrimaryButton: { template: '<button><slot /></button>' },
        SecondaryButton: { template: '<button><slot /></button>' },
        Badge: { template: '<span><slot /></span>' },
        Drawer: { template: '<div><slot /></div>' },
        StepDAGVisualization: { template: '<div></div>' },
        StepDefinitionForm: { template: '<div></div>' },
      },
    },
  });
}

describe('WorkflowDefinitionStepsView step order marker', () => {
  // BCH-1154: step cards prepend #<order> before the name, which is noisy and not useful
  it('does not render the #<order> prefix in step card headers', () => {
    const wrapper = mountComponent();

    // The step name should appear without the order marker
    expect(wrapper.text()).toContain('Review Access');
    expect(wrapper.text()).not.toContain('#3');
  });
});
