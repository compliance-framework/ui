import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  buildAiDiagnosticsCacheHitChartData,
  buildAiDiagnosticsTokenChartData,
  type AiDiagnosticsRun,
  type AiDiagnosticsRunDetail,
  type AiDiagnosticsSummary,
} from '@/views/admin/partials/ai-diagnostics';

const state = vi.hoisted(() => {
  function testRef<T>(value: T) {
    return { __v_isRef: true, value };
  }

  return {
    aiEnabled: true,
    aiFetched: true,
    fetchConfig: vi.fn(),
    summary: testRef<AiDiagnosticsSummary | null>(null),
    runs: testRef<AiDiagnosticsRun[]>([]),
    detail: testRef<AiDiagnosticsRunDetail | null>(null),
    nextCursor: testRef<string | null>(null),
    summaryLoading: testRef(false),
    runsLoading: testRef(false),
    detailLoading: testRef(false),
    summaryError: testRef<string | null>(null),
    runsError: testRef<string | null>(null),
    paginationError: testRef<string | null>(null),
    detailError: testRef<string | null>(null),
    refreshSummary: vi.fn(),
    refreshRuns: vi.fn(),
    loadMoreRuns: vi.fn(),
    fetchRunDetail: vi.fn(),
    pollWhileActive: vi.fn(),
    stopPolling: vi.fn(),
  };
});

vi.mock('@/stores/ai-config', () => ({
  useAiConfigStore: () => ({
    get dashboardSuggestionsEnabled() {
      return state.aiEnabled;
    },
    get dashboardSuggestionsConfigFetched() {
      return state.aiFetched;
    },
    fetchDashboardSuggestionsConfig: state.fetchConfig,
  }),
}));

vi.mock('@/composables/useAiDiagnostics', () => ({
  useAiDiagnostics: () => ({
    summary: state.summary,
    runs: state.runs,
    nextCursor: state.nextCursor,
    selectedRunDetail: state.detail,
    summaryLoading: state.summaryLoading,
    runsLoading: state.runsLoading,
    runDetailLoading: state.detailLoading,
    summaryError: state.summaryError,
    runsError: state.runsError,
    paginationError: state.paginationError,
    runDetailError: state.detailError,
    refreshSummary: state.refreshSummary,
    refreshRuns: state.refreshRuns,
    loadMoreRuns: state.loadMoreRuns,
    fetchRunDetail: state.fetchRunDetail,
    pollWhileActive: state.pollWhileActive,
    stopPolling: state.stopPolling,
  }),
}));

vi.mock('@/components/charts/LineChart.vue', () => ({
  default: {
    name: 'LineChart',
    props: ['data', 'options'],
    template: '<div class="line-chart">{{ data.datasets.length }}</div>',
  },
}));

import AiDiagnosticsView from '../admin/AiDiagnosticsView.vue';

function mountView() {
  return mount(AiDiagnosticsView, {
    global: {
      stubs: {
        PageCard: { template: '<section><slot /></section>' },
        Message: { template: '<div><slot /></div>' },
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
        Drawer: {
          props: ['visible', 'header'],
          emits: ['update:visible'],
          template: '<aside v-if="visible"><slot /></aside>',
        },
        SecondaryButton: {
          emits: ['click'],
          props: ['disabled', 'type'],
          template:
            '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        Tabs: { template: '<div><slot /></div>' },
        TabList: { template: '<div><slot /></div>' },
        Tab: { template: '<button><slot /></button>' },
        TabPanels: { template: '<div><slot /></div>' },
        TabPanel: { template: '<section><slot /></section>' },
      },
    },
  });
}

describe('AiDiagnosticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.aiEnabled = true;
    state.aiFetched = true;
    state.fetchConfig.mockResolvedValue(true);
    state.summary.value = {
      enabled: true,
      config: {
        model: 'gpt-5.2',
        promptVersion: 'v4',
        maxControlsPerChunk: 5,
        maxLabelSetsPerChunk: 4,
        maxCallsPerRun: 25,
        queueWorkers: 2,
      },
      totals: {
        runs: 3,
        runsByStatus: {
          pending: 0,
          running: 1,
          completed: 1,
          failed: 1,
        },
        cellsCompleted: 8,
        cellsFailed: 2,
        inputTokens: 12000,
        outputTokens: 1800,
        cacheReadInputTokens: 4000,
        cacheCreationInputTokens: 3000,
        cacheHitRatio: 0.42,
        mappingsReturned: 18,
        mappingsRejected: 3,
        suggestionsAccepted: 6,
        suggestionsRejected: 2,
        suggestionsPending: 4,
        rateLimitedTotal: 5,
      },
      queue: {
        name: 'suggestion',
        available: 2,
        running: 1,
        retryable: 0,
        scheduled: 3,
        oldestAvailableAt: '2026-06-16T12:00:00Z',
      },
      checks: [
        {
          id: 'cache_engaging',
          status: 'warn',
          message:
            "caching never wrote - likely under the model's 4,096-token minimum",
          recommendedActions: ['Increase chunk sizes.'],
        },
        {
          id: 'rate_limit_pressure',
          status: 'fail',
          message: 'Rate limits are slowing runs.',
          recommendedActions: ['Lower queue workers.'],
        },
        {
          id: 'queue_available',
          status: 'pass',
          message: 'Suggestion queue is healthy.',
        },
      ],
    };
    state.runs.value = [
      {
        id: 'run-1',
        sspId: 'ssp-1',
        sspName: 'Payments SSP',
        status: 'completed',
        model: 'gpt-5.2',
        promptVersion: 'v4',
        plannedCalls: 4,
        completedCells: 4,
        failedCells: 0,
        inputTokens: 1000,
        outputTokens: 200,
        cacheReadInputTokens: 500,
        cacheCreationInputTokens: 100,
        cacheHitRatio: 0.5,
        mappingsReturned: 8,
        mappingsRejected: 1,
        rateLimitedTotal: 2,
        startedAt: '2026-06-16T12:00:00Z',
        completedAt: '2026-06-16T12:01:00Z',
        durationMs: 60000,
        triggeredBy: { id: 'u-1', name: 'Ada' },
      },
    ];
    state.detail.value = null;
    state.nextCursor.value = 'next-1';
    state.summaryLoading.value = false;
    state.runsLoading.value = false;
    state.detailLoading.value = false;
    state.summaryError.value = null;
    state.runsError.value = null;
    state.paginationError.value = null;
    state.detailError.value = null;
    state.fetchRunDetail.mockImplementation(async () => {
      state.detail.value = {
        ...state.runs.value[0],
        scope: {
          controlKeys: ['AC-1'],
          labelSetHashes: ['hash-1'],
          labelSets: [{ _policy: 'secret_scanning', repository: 'api' }],
        },
        cells: [
          {
            cellIndex: 0,
            status: 'completed',
            controlKeys: ['AC-1'],
            labelSetHashes: ['hash-1'],
            inputTokens: 600,
            outputTokens: 100,
            cacheReadInputTokens: 300,
            cacheCreationInputTokens: 50,
            rateLimitedCount: 0,
            mappingsReturned: 4,
            mappingsRejected: 0,
            completedAt: '2026-06-16T12:00:30Z',
          },
          {
            cellIndex: 1,
            status: 'failed',
            controlKeys: ['AC-2'],
            labelSetHashes: ['hash-2'],
            inputTokens: 400,
            outputTokens: 0,
            cacheReadInputTokens: 200,
            cacheCreationInputTokens: 50,
            rateLimitedCount: 1,
            mappingsReturned: 0,
            mappingsRejected: 1,
            error: 'model timeout',
          },
        ],
        events: [
          {
            id: 'evt-1',
            action: 'run_started',
            actor: 'Ada',
            message: 'Run started.',
            createdAt: '2026-06-16T12:00:00Z',
          },
        ],
      };
      return state.detail.value;
    });
  });

  it('renders the disabled message without loading diagnostics when AI is off', async () => {
    state.aiEnabled = false;
    state.aiFetched = false;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return false;
    });

    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.$forceUpdate();
    await nextTick();

    expect(wrapper.text()).toContain(
      'AI is not configured, so AI suggestions diagnostics are unavailable.',
    );
    expect(state.refreshSummary).not.toHaveBeenCalled();
    expect(state.refreshRuns).not.toHaveBeenCalled();
  });

  it('renders summary totals, checks, and the full cache warning', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('42%');
    expect(wrapper.text()).toContain('12,000');
    expect(wrapper.text()).toContain(
      "caching never wrote - likely under the model's 4,096-token minimum",
    );
    expect(wrapper.text()).toContain('Increase chunk sizes.');
    expect(wrapper.text()).toContain('Rate limits are slowing runs.');
  });

  it('passes filters and cursor pagination params through the composable', async () => {
    const wrapper = mountView();
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[0].setValue('failed');
    await wrapper
      .find('[data-testid="ai-diagnostics-ssp-filter"]')
      .setValue('ssp-1');
    await selects[1].setValue('25');

    expect(state.refreshRuns).toHaveBeenLastCalledWith({
      status: 'failed',
      sspId: 'ssp-1',
      limit: 25,
    });

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Load More')
      ?.trigger('click');

    expect(state.loadMoreRuns).toHaveBeenCalledWith({
      status: 'failed',
      sspId: 'ssp-1',
      limit: 25,
    });
  });

  it('opens the run drawer with cells, failed errors, scope, and events', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper
      .findAll('tbody tr')
      .find((row) => row.text().includes('Payments SSP'))
      ?.trigger('click');
    await flushPromises();

    expect(state.fetchRunDetail).toHaveBeenCalledWith('run-1');
    expect(wrapper.text()).toContain('Cell 1: model timeout');
    expect(wrapper.text()).toContain('_policy=secret_scanning');
    expect(wrapper.text()).toContain('AC-1');
    expect(wrapper.text()).toContain('run_started');
    expect(wrapper.text()).toContain('Run started.');
  });
});

describe('AI diagnostics chart builders', () => {
  it('buckets token and cache-hit series by run start day', () => {
    const runs: AiDiagnosticsRun[] = [
      {
        id: 'run-1',
        status: 'completed',
        plannedCalls: 1,
        completedCells: 1,
        failedCells: 0,
        inputTokens: 100,
        outputTokens: 20,
        cacheReadInputTokens: 40,
        cacheCreationInputTokens: 10,
        cacheHitRatio: 0.4,
        mappingsReturned: 1,
        mappingsRejected: 0,
        rateLimitedTotal: 0,
        startedAt: '2026-06-15T10:00:00Z',
      },
      {
        id: 'run-2',
        status: 'completed',
        plannedCalls: 1,
        completedCells: 1,
        failedCells: 0,
        inputTokens: 200,
        outputTokens: 30,
        cacheReadInputTokens: 80,
        cacheCreationInputTokens: 20,
        cacheHitRatio: 0.6,
        mappingsReturned: 1,
        mappingsRejected: 0,
        rateLimitedTotal: 0,
        startedAt: '2026-06-15T11:00:00Z',
      },
      {
        id: 'run-3',
        status: 'failed',
        plannedCalls: 1,
        completedCells: 0,
        failedCells: 1,
        inputTokens: 50,
        outputTokens: 0,
        cacheReadInputTokens: 10,
        cacheCreationInputTokens: 5,
        cacheHitRatio: 0.2,
        mappingsReturned: 0,
        mappingsRejected: 1,
        rateLimitedTotal: 1,
        startedAt: '2026-06-16T10:00:00Z',
      },
    ];

    const tokenData = buildAiDiagnosticsTokenChartData(runs);
    expect(tokenData.labels).toEqual(['2026-06-15', '2026-06-16']);
    expect(tokenData.datasets[0].data).toEqual([300, 50]);
    expect(tokenData.datasets[1].data).toEqual([120, 10]);
    expect(tokenData.datasets[2].data).toEqual([30, 5]);

    const cacheData = buildAiDiagnosticsCacheHitChartData(runs);
    expect(cacheData.labels).toEqual(['2026-06-15', '2026-06-16']);
    expect(cacheData.datasets[0].data).toEqual([50, 20]);
  });
});
