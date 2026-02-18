import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import StepExecutionPanel from '../StepExecutionPanel.vue';
import type { StepExecution } from '@/types/workflows';

const mockStartStep = vi.fn();
const mockCompleteStep = vi.fn();
const mockFailStep = vi.fn();
const mockCanTransition = vi.fn();
const mockReassignStepExecution = vi.fn();
const mockSearchUsers = vi.fn();
const mockUserSuggestions = ref([]);

vi.mock('@/composables/workflows', () => ({
  useStepExecutions: () => ({
    startStep: mockStartStep,
    completeStep: mockCompleteStep,
    failStep: mockFailStep,
    canTransition: mockCanTransition,
    reassignStepExecution: mockReassignStepExecution,
  }),
  useUserSearch: () => ({
    userSuggestions: mockUserSuggestions,
    searchUsers: mockSearchUsers,
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
        Drawer: { template: '<div><slot /></div>' },
        Dialog: {
          props: ['visible'],
          template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
        },
        Badge: { template: '<span><slot /></span>' },
        Label: { template: '<label><slot /></label>' },
        Textarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        PrimaryButton: { template: '<button><slot /></button>' },
        SecondaryButton: { template: '<button><slot /></button>' },
        Message: { template: '<div><slot /></div>' },
        AutoComplete: { template: '<div class="autocomplete-stub"></div>' },
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
    vi.clearAllMocks();
    mockCanTransition.mockResolvedValue(true);
    mockReassignStepExecution.mockResolvedValue({});
  });

  it('shows reassignment action only when user can transition and status is reassignable', async () => {
    const wrapper = mountComponent(createStep('pending'));
    await flushPromises();
    expect(hasButton(wrapper, 'Reassign Task')).toBe(true);

    mockCanTransition.mockResolvedValueOnce(false);
    const noPermissionWrapper = mountComponent(createStep('pending'));
    await flushPromises();
    expect(hasButton(noPermissionWrapper, 'Reassign Task')).toBe(false);

    mockCanTransition.mockResolvedValueOnce(true);
    const completedWrapper = mountComponent(createStep('completed'));
    await flushPromises();
    expect(hasButton(completedWrapper, 'Reassign Task')).toBe(false);
  });

  it('blocks reassignment submission when no valid user is selected', async () => {
    const wrapper = mountComponent(createStep('in_progress'));
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign Task'));
    expect(reassignButton).toBeDefined();
    await reassignButton!.trigger('click');
    await flushPromises();

    const form = wrapper.find('#reassign-form');
    expect(form.exists()).toBe(true);
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(
      'Please select a valid user with an email address.',
    );
    expect(mockReassignStepExecution).not.toHaveBeenCalled();
  });

  it('submits reassignment with selected email and optional reason', async () => {
    const wrapper = mountComponent(createStep('blocked'));
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign Task'));
    await reassignButton!.trigger('click');
    await flushPromises();

    (wrapper.vm as unknown as Record<string, unknown>).selectedReassignUser = {
      id: 'user-2',
      email: 'delegate@example.com',
      displayName: 'Delegate User',
      firstName: 'Delegate',
      lastName: 'User',
      failedLogins: 0,
    };
    (wrapper.vm as unknown as Record<string, unknown>).reassignReason =
      'Out of office handoff';
    await flushPromises();

    await wrapper.find('#reassign-form').trigger('submit');
    await flushPromises();

    expect(mockReassignStepExecution).toHaveBeenCalledWith('step-1', {
      assignedToType: 'email',
      assignedToId: 'delegate@example.com',
      reason: 'Out of office handoff',
    });
    expect(wrapper.emitted('step-updated')).toBeTruthy();
  });
});

describe('StepExecutionPanel overdue behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanTransition.mockResolvedValue(true);
  });

  it('shows overdue metadata and allows completion notes for overdue steps', async () => {
    const wrapper = mountComponent(
      createStep('overdue', { overdueAt: '2026-01-10T12:00:00.000Z' }),
    );
    await flushPromises();

    expect(wrapper.text()).toContain('Overdue since');
    expect(wrapper.find('#completionNotes').exists()).toBe(true);
  });

  it('shows complete/fail actions for overdue steps when user can transition', async () => {
    const wrapper = mountComponent(createStep('overdue'));
    await flushPromises();

    expect(hasButton(wrapper, 'Complete Step')).toBe(true);
    expect(hasButton(wrapper, 'Mark Failed')).toBe(true);
  });
});
