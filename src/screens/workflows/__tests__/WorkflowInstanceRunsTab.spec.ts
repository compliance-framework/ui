import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import { formatDateTime } from '@/ds/format';
import WorkflowInstanceExecutionsView from '../WorkflowInstanceRunsTab.vue';
import type { WorkflowExecution, WorkflowInstance } from '@/types/workflows';

const mockStore = reactive({
  instance: {
    id: 'instance-1',
    name: 'Test Instance',
    workflowDefinitionId: 'def-1',
    cadence: 'monthly',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as WorkflowInstance | null,
  executions: [] as WorkflowExecution[],
  isActive: true,
  addExecutionLocally: vi.fn(),
});

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('@/stores/workflows/instances', () => ({
  useWorkflowInstanceStore: () => mockStore,
}));

vi.mock('@/composables/workflows', () => ({
  useWorkflowExecutions: () => ({
    startExecution: vi.fn(),
  }),
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

async function mountComponent() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      {
        path: '/workflow-executions/:id',
        name: 'workflow-execution-view',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/');
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(WorkflowInstanceExecutionsView)),
    }),
    { global: { plugins: [router] } },
  );
}

describe('WorkflowInstanceRunsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockStore.executions = [];
    mockStore.isActive = true;
    mockStore.instance = {
      id: 'instance-1',
      name: 'Test Instance',
      workflowDefinitionId: 'def-1',
      cadence: 'monthly',
      isActive: true,
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

    const wrapper = await mountComponent();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);

    const startedText = rows[0].find('a').text();
    // The run started at 09:05; 09:00 is only when it was triggered.
    expect(startedText).toBe(formatDateTime('2026-01-01T09:05:00.000Z'));
    expect(startedText).not.toBe(formatDateTime('2026-01-01T09:00:00.000Z'));
  });

  it('shows state-specific text in Completed column for in-progress executions', async () => {
    mockStore.executions = [
      createExecution({ status: 'in_progress', completedAt: undefined }),
    ];

    const wrapper = await mountComponent();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].text().toLowerCase()).toContain('in progress');
  });
});
