import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import MyTasksView from '../MyTasksScreen.vue';
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
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    ...overrides,
  };
}

function mountComponent() {
  const root = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(MyTasksView)),
    }),
    {
      attachTo: document.body,
      global: {
        stubs: {
          StepExecutionPanel: {
            name: 'StepExecutionPanel',
            props: ['step', 'visible', 'openReassignOnOpen'],
            emits: ['update:visible', 'step-updated'],
            template:
              '<div><button class="emit-update" @click="$emit(\'step-updated\')">emit</button></div>',
          },
        },
      },
    },
  );
  // The screen itself, so specs can read its state as they did on the classic page.
  return root.findComponent(MyTasksView);
}

const action = (wrapper: ReturnType<typeof mountComponent>, label: string) =>
  (wrapper.findComponent(Menu).props('items') as MenuAction[]).find(
    (item) => item.label === label,
  )!;

// The mocked assignments are shared refs, so each mounted screen must go before the next test.
enableAutoUnmount(afterEach);

describe('MyTasksScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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

  it('offers Reassign for reassignable tasks', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(action(wrapper, 'Reassign').disabledReason).toBeUndefined();
  });

  it('explains why a finished task cannot be reassigned', async () => {
    mockAssignments.value = [createStep('completed')];
    const wrapper = mountComponent();
    await flushPromises();

    expect(action(wrapper, 'Reassign').disabledReason).toBeDefined();
  });

  it('opens reassignment drawer state from quick reassign action', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    action(wrapper, 'Reassign').onSelect!();
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

  // BCH-1156: simulate a real user typing into the date inputs (setValue dispatches
  // the DOM input event that v-model listens to) and verify the filter params reach
  // fetchMyAssignments — this mirrors actual browser behaviour unlike setting vm refs directly.
  it('passes due-date filter params to fetchMyAssignments when date inputs are changed by the user', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    mockFetchMyAssignments.mockClear();

    const dates = wrapper.findAll('input[type="date"]');
    await dates[0]!.setValue('2026-05-26');
    await dates[1]!.setValue('2026-05-28');
    await flushPromises();

    const calls = mockFetchMyAssignments.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0];

    expect(lastCall.dueAfter).toBe('2026-05-26');
    expect(lastCall.dueBefore).toBe('2026-05-28');
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
