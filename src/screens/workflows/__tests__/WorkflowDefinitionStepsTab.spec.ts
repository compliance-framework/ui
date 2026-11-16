import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import WorkflowDefinitionStepsView from '../WorkflowDefinitionStepsTab.vue';
import type { StepDefinition, WorkflowDefinition } from '@/types/workflows';

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

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
  setActivePinia(createPinia());
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(WorkflowDefinitionStepsView)),
    }),
    {
      global: {
        stubs: {
          FlowGraph: { template: '<div></div>' },
          StepForm: { template: '<div></div>' },
        },
      },
    },
  );
}

describe('WorkflowDefinitionStepsTab step order marker', () => {
  // BCH-1154: step cards prepend #<order> before the name, which is noisy and not useful
  it('does not render the #<order> prefix in step card headers', () => {
    const wrapper = mountComponent();

    // The step's row shows its name and no order marker
    const row = wrapper.find('tbody tr');
    expect(row.text()).toContain('Review Access');
    expect(row.text()).not.toContain('#3');
  });
});
