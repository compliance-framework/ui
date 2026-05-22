import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import WorkflowInstanceExecutionsView from '../WorkflowInstanceExecutionsView.vue';
import type { WorkflowExecution, WorkflowInstance } from '@/types/workflows';

const mockStore = reactive({
  instance: {
    id: 'instance-1',
    name: 'Test Instance',
    workflowDefinitionId: 'def-1',
    cadence: 'monthly',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as WorkflowInstance | null,
  executions: [] as WorkflowExecution[],
  isActive: true,
  addExecutionLocally: vi.fn(),
});

vi.mock('@/stores/workflows/instances', () => ({
  useWorkflowInstanceStore: () => mockStore,
}));

vi.mock('@/composables/workflows', () => ({
  useWorkflowExecutions: () => ({
    startExecution: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function createExecution(
  overrides: Partial<WorkflowExecution> = {},
): WorkflowExecution {
  return {
    id: 'exec-1',
    workflowInstanceId: 'instance-1',
    status: 'in_progress',
    triggeredBy: 'manual',
    triggeredAt: '2026-01-01T09:00:00.000Z',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  };
}

function mountComponent() {
  return mount(WorkflowInstanceExecutionsView, {
    global: {
      stubs: {
        PrimaryButton: { template: '<button><slot /></button>' },
        SecondaryButton: { template: '<button><slot /></button>' },
        RouterLinkButton: { template: '<a><slot /></a>' },
        Badge: { template: '<span><slot /></span>' },
        Dialog: { template: '<div><slot /></div>' },
      },
    },
  });
}

describe('WorkflowInstanceExecutionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.executions = [];
    mockStore.isActive = true;
    mockStore.instance = {
      id: 'instance-1',
      name: 'Test Instance',
      workflowDefinitionId: 'def-1',
      cadence: 'monthly',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  });

  it('renders startedAt in the Started column, not triggeredAt', async () => {
    mockStore.executions = [
      createExecution({
        triggeredAt: '2026-01-01T09:00:00.000Z',
        startedAt: '2026-01-01T09:05:00.000Z',
      }),
    ];

    const wrapper = mountComponent();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);

    const startedCell = rows[0].findAll('td')[0];
    const startedText = startedCell.text();

    const triggeredDate = new Date('2026-01-01T09:00:00.000Z').toLocaleString();
    const startedDate = new Date('2026-01-01T09:05:00.000Z').toLocaleString();

    expect(startedText).toContain(startedDate);
    expect(startedText).not.toContain(triggeredDate);
  });

  it('shows state-specific text in Completed column for in-progress executions', async () => {
    mockStore.executions = [
      createExecution({ status: 'in_progress', completedAt: undefined }),
    ];

    const wrapper = mountComponent();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const completedCell = rows[0].findAll('td')[3];

    expect(completedCell.text()).not.toBe('-');
    expect(completedCell.text().toLowerCase()).toContain('in progress');
  });
});
