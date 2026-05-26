import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import WorkflowExecutionView from '../WorkflowExecutionView.vue';
import type { WorkflowExecution } from '@/types/workflows';

const mockGetExecution = vi.fn();
const mockGetExecutionStatus = vi.fn();
const mockGetExecutionMetrics = vi.fn();
const mockCancelExecution = vi.fn();
const mockRetryExecution = vi.fn();
const mockListStepExecutions = vi.fn();

const execution = ref<WorkflowExecution | null>(null);
const executionStatus = ref(null);
const executionMetrics = ref(null);
const stepExecutions = ref([]);

vi.mock('@/composables/workflows', () => ({
  useWorkflowExecutions: () => ({
    execution,
    executionStatus,
    executionMetrics,
    getExecution: mockGetExecution,
    getExecutionStatus: mockGetExecutionStatus,
    getExecutionMetrics: mockGetExecutionMetrics,
    cancelExecution: mockCancelExecution,
    retryExecution: mockRetryExecution,
    executionStatusLoaded: ref(true),
    executionMetricsLoaded: ref(true),
  }),
  useStepExecutions: () => ({
    stepExecutions,
    listStepExecutions: mockListStepExecutions,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'exec-1' } }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

function createExecution(
  status: WorkflowExecution['status'],
  overrides: Partial<WorkflowExecution> = {},
): WorkflowExecution {
  return {
    id: 'exec-1',
    workflowInstanceId: 'inst-1',
    status,
    triggeredBy: 'manual',
    triggeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mountComponent() {
  return mount(WorkflowExecutionView, {
    global: {
      stubs: {
        PageHeader: { template: '<div><slot /></div>' },
        PageSubHeader: { template: '<div><slot /></div>' },
        Badge: { template: '<span><slot /></span>' },
        Message: { template: '<div><slot /></div>' },
        SecondaryButton: { template: '<button><slot /></button>' },
        RouterLinkButton: {
          props: ['to'],
          template: '<a :href="JSON.stringify(to)"><slot /></a>',
        },
        ExecutionMetrics: { template: '<div></div>' },
        ExecutionDAGView: { template: '<div></div>' },
        StepExecutionList: { template: '<div></div>' },
        StepExecutionPanel: { template: '<div></div>' },
      },
    },
  });
}

describe('WorkflowExecutionView evidence stream link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execution.value = null;
    executionStatus.value = null;
    executionMetrics.value = null;
    stepExecutions.value = [];
    mockGetExecution.mockResolvedValue(undefined);
    mockGetExecutionStatus.mockResolvedValue(undefined);
    mockGetExecutionMetrics.mockResolvedValue(undefined);
    mockListStepExecutions.mockResolvedValue(undefined);
  });

  // BCH-1155: completed executions must expose a navigable link to the evidence stream
  it('shows evidence stream link when execution is completed and has executionStreamUuid', async () => {
    execution.value = createExecution('completed', {
      executionStreamUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      completedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('View Evidence Stream');
    const link = wrapper.find(
      'a[href*="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"]',
    );
    expect(link.exists()).toBe(true);
    const to = JSON.parse(link.attributes('href') ?? '{}');
    expect(to).toMatchObject({
      name: 'evidence:history',
      params: { uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    });
  });

  // BCH-1155: failed executions must also expose a link to the evidence stream
  it('shows evidence stream link when execution is failed and has executionStreamUuid', async () => {
    execution.value = createExecution('failed', {
      executionStreamUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      failureReason: 'some failure',
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('View Evidence Stream');
    const link = wrapper.find(
      'a[href*="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"]',
    );
    expect(link.exists()).toBe(true);
    const to = JSON.parse(link.attributes('href') ?? '{}');
    expect(to).toMatchObject({
      name: 'evidence:history',
      params: { uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    });
  });

  // BCH-1155: in-progress executions have no terminal evidence yet — no link expected
  it('does not show evidence stream link for in_progress execution', async () => {
    execution.value = createExecution('in_progress', {
      executionStreamUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).not.toContain('View Evidence Stream');
  });

  // BCH-1155: no link when UUID is absent even if status is terminal
  it('does not show evidence stream link when executionStreamUuid is absent', async () => {
    execution.value = createExecution('completed', {
      completedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).not.toContain('View Evidence Stream');
  });
});
