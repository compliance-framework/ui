import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import MyTasksView from '../MyTasksView.vue';
import type { StepExecution } from '@/types/workflows';

const mockAssignments = ref<StepExecution[]>([]);
const mockTotal = ref(0);
const mockLoading = ref(false);
const mockError = ref<string | null>(null);
const mockFetchMyAssignments = vi.fn();

vi.mock('@/composables/workflows/useMyAssignments', () => ({
  useMyAssignments: () => ({
    assignments: mockAssignments,
    total: mockTotal,
    loading: mockLoading,
    error: mockError,
    fetchMyAssignments: mockFetchMyAssignments,
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
      name: 'Review Evidence',
      order: 1,
      evidenceRequired: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    workflowExecution: {
      id: 'exec-1',
      workflowInstanceId: 'instance-1',
      status: 'in_progress',
      triggeredBy: 'manual',
      triggeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowInstance: {
        id: 'instance-1',
        workflowDefinitionId: 'wf-1',
        name: 'Monthly Access Review',
        cadence: 'monthly',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    ...overrides,
  };
}

function mountComponent() {
  return mount(MyTasksView, {
    global: {
      stubs: {
        PageHeader: { template: '<div><slot /></div>' },
        PageSubHeader: { template: '<div><slot /></div>' },
        PageCard: { template: '<div><slot /></div>' },
        Label: { template: '<label><slot /></label>' },
        Select: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template: '<div class="select-stub"></div>',
        },
        Badge: { template: '<span><slot /></span>' },
        Message: { template: '<div><slot /></div>' },
        SecondaryButton: { template: '<button><slot /></button>' },
        StepExecutionPanel: {
          name: 'StepExecutionPanel',
          props: ['step', 'visible', 'openReassignOnOpen'],
          emits: ['update:visible', 'step-updated'],
          template:
            '<div><button class="emit-update" @click="$emit(\'step-updated\')">emit</button></div>',
        },
      },
    },
  });
}

describe('MyTasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignments.value = [createStep('pending')];
    mockTotal.value = 1;
    mockLoading.value = false;
    mockError.value = null;
    mockFetchMyAssignments.mockResolvedValue({
      data: mockAssignments.value,
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('renders quick reassign button for reassignable tasks', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign'));

    expect(reassignButton).toBeDefined();
  });

  it('opens reassignment drawer state from quick reassign action', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const reassignButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reassign'));
    await reassignButton!.trigger('click');
    await flushPromises();

    expect(
      (wrapper.vm as unknown as { showStepPanel: boolean }).showStepPanel,
    ).toBe(true);
    expect(
      (wrapper.vm as unknown as { selectedStep: StepExecution | null })
        .selectedStep?.id,
    ).toBe('step-1');

    const panel = wrapper.findComponent({ name: 'StepExecutionPanel' });
    expect(panel.props('openReassignOnOpen')).toBe(true);
  });

  it('refreshes assignments when step-updated is emitted by panel', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(mockFetchMyAssignments).toHaveBeenCalledTimes(1);

    const emitUpdate = wrapper.find('button.emit-update');
    await emitUpdate.trigger('click');
    await flushPromises();

    expect(mockFetchMyAssignments).toHaveBeenCalledTimes(2);
  });

  it('sorts unresolved assignments first and by nearest due date', async () => {
    const overdueDueSoon = createStep('overdue', {
      id: 'step-overdue-1',
      dueDate: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const inProgressDueLater = createStep('in_progress', {
      id: 'step-in-progress-1',
      dueDate: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const completedMostRecent = createStep('completed', {
      id: 'step-completed-1',
      dueDate: undefined,
      updatedAt: '2026-01-04T00:00:00.000Z',
    });

    mockAssignments.value = [
      completedMostRecent,
      inProgressDueLater,
      overdueDueSoon,
    ];
    mockTotal.value = 3;

    const wrapper = mountComponent();
    await flushPromises();

    const sortedAssignments = (
      wrapper.vm as unknown as { sortedAssignments: StepExecution[] }
    ).sortedAssignments;
    expect(sortedAssignments.map((step) => step.id)).toEqual([
      'step-overdue-1',
      'step-in-progress-1',
      'step-completed-1',
    ]);
  });

  it('applies due-date filters when loading assignments', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    mockFetchMyAssignments.mockClear();

    (wrapper.vm as unknown as { dueAfterFilter: string }).dueAfterFilter =
      '2026-01-01';
    await flushPromises();

    (wrapper.vm as unknown as { dueBeforeFilter: string }).dueBeforeFilter =
      '2026-01-31';
    await flushPromises();

    const lastCall =
      mockFetchMyAssignments.mock.calls[
        mockFetchMyAssignments.mock.calls.length - 1
      ][0];

    expect(lastCall.dueAfter).toBe('2026-01-01');
    expect(lastCall.dueBefore).toBe('2026-01-31');
  });
});
