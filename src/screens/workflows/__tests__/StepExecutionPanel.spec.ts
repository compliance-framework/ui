import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StepExecutionPanel from '../StepExecutionPanel.vue';
import type { StepExecution } from '@/types/workflows';

const mockStartStep = vi.fn();
const mockCompleteStep = vi.fn();
const mockFailStep = vi.fn();
const mockCanTransition = vi.fn();
const mockReassignStepExecution = vi.fn();

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('@/composables/workflows', () => ({
  useStepExecutions: () => ({
    startStep: mockStartStep,
    completeStep: mockCompleteStep,
    failStep: mockFailStep,
    canTransition: mockCanTransition,
    reassignStepExecution: mockReassignStepExecution,
  }),
}));

function createStep(
  status: StepExecution['status'] = 'pending',
  overrides: Partial<StepExecution> = {},
): StepExecution {
  return {
    id: 'step-1',
    status,
    workflowExecutionId: 'exec-1',
    workflowStepDefinitionId: 'def-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflowStepDefinition: {
      id: 'def-1',
      workflowDefinitionId: 'wf-1',
      name: 'Step A',
      order: 1,
      evidenceRequired: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

function mountComponent(step: StepExecution) {
  return mount(StepExecutionPanel, {
    props: {
      step,
      visible: true,
    },
    global: {
      stubs: {
        Tooltip: { template: '<slot />' },
        Drawer: { template: '<div><slot /><slot name="footer" /></div>' },
        Dialog: {
          props: ['open'],
          template: '<div v-if="open"><slot /></div>',
        },
        ConfirmDialog: {
          props: ['open'],
          template: '<div v-if="open"><slot /></div>',
        },
        Textarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        StepReassignForm: {
          name: 'StepReassignForm',
          props: ['error'],
          emits: ['submit', 'cancel'],
          template:
            "<form id=\"reassign-form\" @submit.prevent=\"$emit('submit', { userId: '', reason: '' })\"><p>{{ error }}</p></form>",
        },
        EvidenceSubmissionForm: { template: '<div></div>' },
      },
    },
  });
}

function hasButton(wrapper: ReturnType<typeof mount>, text: string): boolean {
  return wrapper
    .findAll('button')
    .some((button) => button.text().replace(/\s+/g, ' ').includes(text));
}

describe('StepExecutionPanel reassignment', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCanTransition.mockResolvedValue(true);
    mockReassignStepExecution.mockResolvedValue({});
  });

  it('shows reassignment action only when user can transition and status is reassignable', async () => {
    const wrapper = mountComponent(createStep('pending'));
    await flushPromises();
    expect(hasButton(wrapper, 'Reassign task')).toBe(true);

    mockCanTransition.mockResolvedValueOnce(false);
    const noPermissionWrapper = mountComponent(createStep('pending'));
    await flushPromises();
    expect(hasButton(noPermissionWrapper, 'Reassign task')).toBe(false);

    mockCanTransition.mockResolvedValueOnce(true);
    const completedWrapper = mountComponent(createStep('completed'));
    await flushPromises();
    expect(hasButton(completedWrapper, 'Reassign task')).toBe(false);
  });

  it('blocks reassignment submission when no valid user is selected', async () => {
    const wrapper = mountComponent(createStep('in_progress'));
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign task'));
    expect(reassignButton).toBeDefined();
    await reassignButton!.trigger('click');
    await flushPromises();

    const form = wrapper.find('#reassign-form');
    expect(form.exists()).toBe(true);
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Choose who to assign it to.');
    expect(mockReassignStepExecution).not.toHaveBeenCalled();
  });

  it('submits reassignment with selected user id and optional reason', async () => {
    const wrapper = mountComponent(createStep('blocked'));
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign task'));
    await reassignButton!.trigger('click');
    await flushPromises();

    wrapper.findComponent({ name: 'StepReassignForm' }).vm.$emit('submit', {
      userId: 'user-2',
      reason: 'Out of office handoff',
    });
    await flushPromises();

    expect(mockReassignStepExecution).toHaveBeenCalledWith('step-1', {
      assignedToType: 'user',
      assignedToId: 'user-2',
      reason: 'Out of office handoff',
    });
    expect(wrapper.emitted('step-updated')).toBeTruthy();
  });
});

// BCH-1149: estimatedDuration is not used operationally and should not be shown
describe('StepExecutionPanel estimated duration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCanTransition.mockResolvedValue(false);
  });

  it('does not render Estimated Duration metadata', async () => {
    const wrapper = mountComponent(
      createStep('pending', {
        workflowStepDefinition: {
          id: 'def-1',
          workflowDefinitionId: 'wf-1',
          name: 'Step A',
          order: 1,
          evidenceRequired: [],
          estimatedDurationMinutes: 45,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    await flushPromises();

    expect(wrapper.text()).not.toContain('Estimated Duration');
  });
});

describe('StepExecutionPanel overdue behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCanTransition.mockResolvedValue(true);
  });

  it('shows overdue metadata and allows completion notes for overdue steps', async () => {
    const wrapper = mountComponent(
      createStep('overdue', { overdueAt: '2026-01-10T12:00:00.000Z' }),
    );
    await flushPromises();

    expect(wrapper.text()).toContain('Overdue since');
    expect(wrapper.text()).toContain('Completion notes');
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('shows complete/fail actions for overdue steps when user can transition', async () => {
    const wrapper = mountComponent(createStep('overdue'));
    await flushPromises();

    expect(hasButton(wrapper, 'Complete step')).toBe(true);
    expect(hasButton(wrapper, 'Mark failed')).toBe(true);
  });
});
