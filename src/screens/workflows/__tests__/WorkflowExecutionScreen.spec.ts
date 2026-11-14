import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import WorkflowExecutionView from '../WorkflowExecutionScreen.vue';
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

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

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
  // Buttons with `to` render a RouterLink; show its target for the assertions.
  RouterLink: {
    props: ['to'],
    template: '<a :href="JSON.stringify(to)"><slot /></a>',
  },
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
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(WorkflowExecutionView)),
    }),
    {
      global: {
        stubs: {
          ExecutionDAGView: { template: '<div></div>' },
          RunStepsTable: { template: '<div></div>' },
          StepExecutionPanel: { template: '<div></div>' },
        },
      },
    },
  );
}

describe('WorkflowExecutionView evidence stream link', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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

    expect(wrapper.text()).toContain('View evidence stream');
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

    expect(wrapper.text()).toContain('View evidence stream');
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

    expect(wrapper.text()).not.toContain('View evidence stream');
  });

  // BCH-1155: no link when UUID is absent even if status is terminal
  it('does not show evidence stream link when executionStreamUuid is absent', async () => {
    execution.value = createExecution('completed', {
      completedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).not.toContain('View evidence stream');
  });

  it('asks why before cancelling a run, then cancels with that reason', async () => {
    execution.value = createExecution('in_progress');
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancel run'))!
      .trigger('click');
    const dialog = wrapper.findComponent(ConfirmDialog);
    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('confirmDisabledReason')).toBeDefined();
    const reason = document.body.querySelector<HTMLTextAreaElement>('textarea');
    if (reason) {
      reason.value = 'Superseded by a new run';
      reason.dispatchEvent(new Event('input'));
    }
    await flushPromises();
    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(mockCancelExecution).toHaveBeenCalledWith(
      'exec-1',
      'Superseded by a new run',
      expect.any(Function),
    );
  });
});
