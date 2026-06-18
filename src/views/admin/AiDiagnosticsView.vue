<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { ChartOptions } from 'chart.js';
import { RouterLink } from 'vue-router';
import PageCard from '@/components/PageCard.vue';
import LineChart from '@/components/charts/LineChart.vue';
import Drawer from '@/volt/Drawer.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import TabPanel from '@/volt/TabPanel.vue';
import TabPanels from '@/volt/TabPanels.vue';
import { useAiConfigStore } from '@/stores/ai-config';
import { useAiDiagnostics } from '@/composables/useAiDiagnostics';
import {
  buildAiDiagnosticsCacheHitChartData,
  buildAiDiagnosticsTokenChartData,
  type AiDiagnosticsCell,
  type AiDiagnosticsCheckStatus,
  type AiDiagnosticsRun,
  type AiDiagnosticsRunsFilters,
  type AiDiagnosticsStatus,
} from '@/views/admin/partials/ai-diagnostics';

const aiConfig = useAiConfigStore();
const statusFilter = ref('');
const sspFilter = ref('');
const limitFilter = ref(50);
const autoRefresh = ref(false);
const hasCompletedInitialConfigLoad = ref(false);
const showRunDrawer = ref(false);
const activeTab = ref<'overview' | 'runs'>('overview');

const {
  summary,
  runs,
  nextCursor,
  selectedRunDetail,
  summaryLoading,
  runsLoading,
  paginationLoading,
  runDetailLoading,
  summaryError,
  runsError,
  paginationError,
  runDetailError,
  refreshSummary,
  refreshRuns,
  loadMoreRuns,
  fetchRunDetail,
  pollWhileActive,
  stopPolling,
} = useAiDiagnostics();

const statusOptions: Array<{ label: string; value: string }> = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const limitOptions = [25, 50, 100, 200];

const chartOptions: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
    },
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 8,
      },
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

const cacheChartOptions: ChartOptions<'line'> = {
  ...chartOptions,
  scales: {
    ...chartOptions.scales,
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value) => `${value}%`,
      },
    },
  },
};

const runsNewestFirst = computed(() =>
  [...runs.value].sort((left, right) => {
    const leftTime = Date.parse(left.startedAt ?? '');
    const rightTime = Date.parse(right.startedAt ?? '');

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  }),
);

const tokenChartData = computed(() =>
  buildAiDiagnosticsTokenChartData(runsNewestFirst.value),
);
const cacheHitChartData = computed(() =>
  buildAiDiagnosticsCacheHitChartData(runsNewestFirst.value),
);

const totalCells = computed(
  () =>
    (summary.value?.totals.cellsCompleted ?? 0) +
    (summary.value?.totals.cellsFailed ?? 0),
);
const cellSuccessRate = computed(() => {
  if (!totalCells.value) return 0;
  return (summary.value?.totals.cellsCompleted ?? 0) / totalCells.value;
});
const failedCellsRate = computed(() => {
  if (!totalCells.value) return 0;
  return (summary.value?.totals.cellsFailed ?? 0) / totalCells.value;
});

const failedCells = computed(() =>
  (selectedRunDetail.value?.cells ?? []).filter(
    (cell) => cell.status === 'failed' || cell.error,
  ),
);

function filters(): AiDiagnosticsRunsFilters {
  return {
    status: statusFilter.value || undefined,
    sspId: sspFilter.value.trim() || undefined,
    limit: limitFilter.value,
  };
}

async function refreshAll() {
  await Promise.all([refreshSummary(), refreshRuns(filters())]);
}

async function applyFilters() {
  await refreshRuns(filters());
}

async function loadMore() {
  await loadMoreRuns(filters());
}

async function openRunDetail(run: AiDiagnosticsRun) {
  showRunDrawer.value = true;
  await fetchRunDetail(run.id);
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    pollWhileActive(refreshAll);
  } else {
    stopPolling();
  }
}

onMounted(async () => {
  await aiConfig.fetchDashboardSuggestionsConfig();
  hasCompletedInitialConfigLoad.value = true;

  if (!aiConfig.dashboardSuggestionsEnabled) {
    return;
  }

  await refreshAll();
});

watch(
  () => aiConfig.dashboardSuggestionsEnabled,
  async (enabled) => {
    if (enabled) {
      if (!hasCompletedInitialConfigLoad.value) {
        return;
      }

      await refreshAll();
      return;
    }

    stopPolling();
  },
);

function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

function formatPercent(value?: number | null): string {
  const numeric = value ?? 0;
  const percent = numeric > 1 ? numeric : numeric * 100;
  return `${Math.round(percent)}%`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(value?: number | null): string {
  if (!value) return 'N/A';

  if (value < 1000) return `${value} ms`;

  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatLabel(value?: string | null): string {
  if (!value) return 'N/A';

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClasses(status: AiDiagnosticsStatus | AiDiagnosticsCheckStatus) {
  switch (status) {
    case 'pass':
    case 'completed':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'warn':
    case 'pending':
      return 'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/40 dark:text-amber-200';
    case 'fail':
    case 'failed':
      return 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/40 dark:bg-red-900/40 dark:text-red-200';
    case 'running':
      return 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/40 dark:text-blue-200';
    default:
      return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function cellStatusClasses(cell: AiDiagnosticsCell) {
  return statusClasses(cell.status);
}

function formatScopeList(values?: string[]): string {
  return values?.length ? values.join(', ') : 'All';
}

function formatLabelSet(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return 'None';
  return entries.map(([key, value]) => `${key}=${value}`).join(', ');
}
</script>

<template>
  <Message
    v-if="!aiConfig.dashboardSuggestionsConfigFetched"
    severity="info"
    variant="outlined"
  >
    Loading dashboard suggestions configuration.
  </Message>

  <Message
    v-else-if="!aiConfig.dashboardSuggestionsEnabled"
    severity="info"
    variant="outlined"
  >
    AI is not configured, so AI suggestions diagnostics are unavailable.
  </Message>

  <div v-else class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          AI Suggestions
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Run history, token usage, cache health, and suggestion outcomes.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="inline-flex items-center gap-2 text-sm">
          <input
            v-model="autoRefresh"
            type="checkbox"
            class="rounded border-ccf-300"
            @change="toggleAutoRefresh"
          />
          Auto-refresh
        </label>
        <SecondaryButton
          type="button"
          :disabled="summaryLoading || runsLoading"
          @click="refreshAll"
        >
          Refresh
        </SecondaryButton>
      </div>
    </div>

    <Message
      v-if="summaryError || runsError"
      severity="warn"
      variant="outlined"
    >
      {{ summaryError || runsError }}
    </Message>

    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="runs">Runs</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="overview">
          <div class="space-y-5 pt-4">
            <div
              v-if="summaryLoading && !summary"
              class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
            >
              Loading AI diagnostics summary...
            </div>

            <template v-if="summary">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <PageCard>
                  <p class="text-sm text-gray-500">Runs</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatNumber(summary.totals.runs) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    Completed
                    {{ formatNumber(summary.totals.runsByStatus.completed) }}
                    · Failed
                    {{ formatNumber(summary.totals.runsByStatus.failed) }}
                    · Running
                    {{ formatNumber(summary.totals.runsByStatus.running) }}
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Cell success</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatPercent(cellSuccessRate) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    {{ formatNumber(summary.totals.cellsCompleted) }} complete ·
                    <span class="text-red-700 dark:text-red-300">
                      {{ formatPercent(failedCellsRate) }} failed
                    </span>
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Tokens</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatNumber(summary.totals.inputTokens) }} /
                    {{ formatNumber(summary.totals.outputTokens) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    Input / output tokens
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Cache hit ratio</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatPercent(summary.totals.cacheHitRatio) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    Read
                    {{ formatNumber(summary.totals.cacheReadInputTokens) }} ·
                    Created
                    {{ formatNumber(summary.totals.cacheCreationInputTokens) }}
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Suggestions</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatNumber(summary.totals.suggestionsAccepted) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    Accepted ·
                    {{ formatNumber(summary.totals.suggestionsRejected) }}
                    rejected ·
                    {{ formatNumber(summary.totals.suggestionsPending) }}
                    pending
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Rate limited</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatNumber(summary.totals.rateLimitedTotal) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    Total rate-limit retries
                  </p>
                </PageCard>
                <PageCard>
                  <p class="text-sm text-gray-500">Mappings</p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatNumber(summary.totals.mappingsReturned) }}
                  </p>
                  <p class="mt-2 text-xs text-gray-500">
                    {{ formatNumber(summary.totals.mappingsRejected) }}
                    rejected
                  </p>
                </PageCard>
              </div>

              <PageCard>
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Health Checks
                </h3>
                <div class="mt-3 divide-y divide-ccf-200 dark:divide-slate-800">
                  <div
                    v-for="check in summary.checks"
                    :key="check.id"
                    class="py-3"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                        :class="statusClasses(check.status)"
                      >
                        {{ formatLabel(check.status) }}
                      </span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {{ formatLabel(check.id) }}
                      </span>
                    </div>
                    <p
                      class="mt-2 whitespace-normal break-words text-sm text-gray-600 dark:text-gray-400"
                    >
                      {{ check.message }}
                    </p>
                    <ul
                      v-if="check.recommendedActions?.length"
                      class="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <li
                        v-for="action in check.recommendedActions"
                        :key="action"
                      >
                        {{ action }}
                      </li>
                    </ul>
                  </div>
                </div>
              </PageCard>

              <PageCard>
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  Configuration
                </h3>
                <div class="mt-3 flex flex-wrap gap-2 text-sm">
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Model: {{ summary.config.model ?? 'N/A' }}
                  </span>
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Prompt: {{ summary.config.promptVersion ?? 'N/A' }}
                  </span>
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Controls/chunk:
                    {{ summary.config.maxControlsPerChunk ?? 'N/A' }}
                  </span>
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Label sets/chunk:
                    {{ summary.config.maxLabelSetsPerChunk ?? 'N/A' }}
                  </span>
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Max calls/run:
                    {{ summary.config.maxCallsPerRun ?? 'N/A' }}
                  </span>
                  <span class="rounded-md border border-ccf-300 px-2.5 py-1">
                    Queue workers: {{ summary.config.queueWorkers ?? 'N/A' }}
                  </span>
                </div>
              </PageCard>

              <PageCard v-if="summary.queue">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3
                      class="text-base font-semibold text-gray-900 dark:text-white"
                    >
                      Suggestion Queue
                    </h3>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {{ summary.queue.name }} · oldest available
                      {{ formatDate(summary.queue.oldestAvailableAt) }}
                    </p>
                  </div>
                  <RouterLink
                    :to="{
                      name: 'admin-diagnostics-notifications',
                    }"
                    class="text-sm font-medium text-primary hover:underline"
                  >
                    Open Notifications
                  </RouterLink>
                </div>
                <div class="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                  <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
                    Available:
                    {{ formatNumber(summary.queue.available) }}
                  </div>
                  <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
                    Running: {{ formatNumber(summary.queue.running) }}
                  </div>
                  <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
                    Retryable: {{ formatNumber(summary.queue.retryable) }}
                  </div>
                  <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
                    Scheduled: {{ formatNumber(summary.queue.scheduled) }}
                  </div>
                </div>
              </PageCard>

              <div class="grid gap-4 xl:grid-cols-2">
                <PageCard>
                  <h3
                    class="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    Token Usage
                  </h3>
                  <div v-if="tokenChartData.labels?.length" class="mt-4 h-64">
                    <LineChart :data="tokenChartData" :options="chartOptions" />
                  </div>
                  <p v-else class="mt-4 text-sm text-gray-600">
                    No run token data is loaded yet.
                  </p>
                </PageCard>
                <PageCard>
                  <h3
                    class="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    Cache Hit Trend
                  </h3>
                  <div
                    v-if="cacheHitChartData.labels?.length"
                    class="mt-4 h-64"
                  >
                    <LineChart
                      :data="cacheHitChartData"
                      :options="cacheChartOptions"
                    />
                  </div>
                  <p v-else class="mt-4 text-sm text-gray-600">
                    No run cache data is loaded yet.
                  </p>
                </PageCard>
              </div>
            </template>
          </div>
        </TabPanel>

        <TabPanel value="runs">
          <div class="space-y-5 pt-4">
            <PageCard>
              <div class="grid gap-3 md:grid-cols-4">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-gray-700 dark:text-slate-300">
                    Status
                  </span>
                  <select
                    v-model="statusFilter"
                    class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    @change="applyFilters"
                  >
                    <option
                      v-for="option in statusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-gray-700 dark:text-slate-300">
                    SSP ID
                  </span>
                  <input
                    v-model="sspFilter"
                    type="search"
                    data-testid="ai-diagnostics-ssp-filter"
                    class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    placeholder="All SSPs"
                    @change="applyFilters"
                  />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-gray-700 dark:text-slate-300">
                    Limit
                  </span>
                  <select
                    v-model.number="limitFilter"
                    class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    @change="applyFilters"
                  >
                    <option
                      v-for="option in limitOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </label>
              </div>
            </PageCard>

            <div
              v-if="runsLoading && !runs.length"
              class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
            >
              Loading AI suggestion runs...
            </div>

            <PageCard v-if="!runsError && (!runsLoading || runs.length)">
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                  <thead
                    class="text-xs uppercase text-gray-500 dark:text-slate-400"
                  >
                    <tr>
                      <th class="px-3 py-2">Started</th>
                      <th class="px-3 py-2">SSP</th>
                      <th class="px-3 py-2">Status</th>
                      <th class="px-3 py-2">Cells</th>
                      <th class="px-3 py-2">Input/Output</th>
                      <th class="px-3 py-2">Cache hit %</th>
                      <th class="px-3 py-2">Rate-limited</th>
                      <th class="px-3 py-2">Model</th>
                      <th class="px-3 py-2">Duration</th>
                      <th class="px-3 py-2">Triggered by</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
                    <tr
                      v-for="run in runsNewestFirst"
                      :key="run.id"
                      class="cursor-pointer align-top hover:bg-ccf-100 dark:hover:bg-slate-800"
                      role="button"
                      tabindex="0"
                      @click="openRunDetail(run)"
                      @keydown.enter="openRunDetail(run)"
                      @keydown.space.prevent="openRunDetail(run)"
                    >
                      <td class="px-3 py-2">{{ formatDate(run.startedAt) }}</td>
                      <td class="px-3 py-2">
                        {{ run.sspName || run.sspId || 'N/A' }}
                      </td>
                      <td class="px-3 py-2">
                        <span
                          class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                          :class="statusClasses(run.status)"
                        >
                          {{ formatLabel(run.status) }}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        {{ formatNumber(run.completedCells) }}/{{
                          formatNumber(run.plannedCalls)
                        }}
                        <span
                          v-if="run.failedCells"
                          class="text-red-700 dark:text-red-300"
                        >
                          ({{ formatNumber(run.failedCells) }} failed)
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        {{ formatNumber(run.inputTokens) }} /
                        {{ formatNumber(run.outputTokens) }}
                      </td>
                      <td class="px-3 py-2">
                        {{ formatPercent(run.cacheHitRatio) }}
                      </td>
                      <td class="px-3 py-2">
                        {{ formatNumber(run.rateLimitedTotal) }}
                      </td>
                      <td class="px-3 py-2">{{ run.model ?? 'N/A' }}</td>
                      <td class="px-3 py-2">
                        {{ formatDuration(run.durationMs) }}
                      </td>
                      <td class="px-3 py-2">
                        {{ run.triggeredBy?.name ?? 'System' }}
                      </td>
                    </tr>
                    <tr v-if="runsNewestFirst.length === 0">
                      <td colspan="10" class="px-3 py-4 text-gray-600">
                        No AI suggestion runs match the current filters.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="nextCursor" class="mt-4">
                <SecondaryButton
                  type="button"
                  :disabled="runsLoading || paginationLoading"
                  @click="loadMore"
                >
                  Load More
                </SecondaryButton>
              </div>
              <div
                v-if="paginationError"
                class="mt-3 text-sm text-red-700 dark:text-red-300"
              >
                {{ paginationError }}
              </div>
            </PageCard>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <Drawer
      v-model:visible="showRunDrawer"
      position="right"
      header="AI Suggestion Run"
      class="w-full max-w-5xl"
    >
      <div class="space-y-5">
        <div
          v-if="runDetailLoading"
          class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
        >
          Loading run details...
        </div>

        <Message v-if="runDetailError" severity="warn" variant="outlined">
          {{ runDetailError }}
        </Message>

        <template v-if="selectedRunDetail && !runDetailLoading">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedRunDetail.sspName || selectedRunDetail.id }}
              </h3>
              <span
                class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                :class="statusClasses(selectedRunDetail.status)"
              >
                {{ formatLabel(selectedRunDetail.status) }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedRunDetail.model ?? 'N/A' }} · prompt
              {{ selectedRunDetail.promptVersion ?? 'N/A' }} ·
              {{ formatDuration(selectedRunDetail.durationMs) }}
            </p>
          </div>

          <dl class="grid gap-3 text-sm sm:grid-cols-3">
            <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="font-medium text-gray-700 dark:text-slate-300">
                Cells
              </dt>
              <dd>
                {{ formatNumber(selectedRunDetail.completedCells) }}/{{
                  formatNumber(selectedRunDetail.plannedCalls)
                }}
                complete ·
                {{ formatNumber(selectedRunDetail.failedCells) }} failed
              </dd>
            </div>
            <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="font-medium text-gray-700 dark:text-slate-300">
                Tokens
              </dt>
              <dd>
                {{ formatNumber(selectedRunDetail.inputTokens) }} in /
                {{ formatNumber(selectedRunDetail.outputTokens) }} out
              </dd>
            </div>
            <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt class="font-medium text-gray-700 dark:text-slate-300">
                Cache
              </dt>
              <dd>
                {{ formatPercent(selectedRunDetail.cacheHitRatio) }} hit ·
                {{ formatNumber(selectedRunDetail.cacheReadInputTokens) }}
                read
              </dd>
            </div>
          </dl>

          <PageCard>
            <h4 class="text-base font-semibold text-gray-900 dark:text-white">
              Scope
            </h4>
            <div class="mt-3 space-y-2 text-sm">
              <p>
                <span class="font-medium">Controls:</span>
                {{ formatScopeList(selectedRunDetail.scope?.controlKeys) }}
              </p>
              <p>
                <span class="font-medium">Label set hashes:</span>
                {{ formatScopeList(selectedRunDetail.scope?.labelSetHashes) }}
              </p>
              <div v-if="selectedRunDetail.scope?.labelSets?.length">
                <p class="font-medium">Label sets:</p>
                <ul class="mt-1 list-disc space-y-1 pl-5">
                  <li
                    v-for="(labelSet, index) in selectedRunDetail.scope
                      ?.labelSets"
                    :key="index"
                  >
                    {{ formatLabelSet(labelSet) }}
                  </li>
                </ul>
              </div>
            </div>
          </PageCard>

          <Message v-if="failedCells.length" severity="warn" variant="outlined">
            <p class="font-semibold">Failed cells</p>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li v-for="cell in failedCells" :key="cell.cellIndex">
                Cell {{ cell.cellIndex }}:
                {{ cell.error ?? 'Failed without an error message.' }}
              </li>
            </ul>
          </Message>

          <PageCard>
            <h4 class="text-base font-semibold text-gray-900 dark:text-white">
              Cells
            </h4>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead class="text-xs uppercase text-gray-500">
                  <tr>
                    <th class="px-3 py-2">Cell</th>
                    <th class="px-3 py-2">Status</th>
                    <th class="px-3 py-2">Controls</th>
                    <th class="px-3 py-2">Label sets</th>
                    <th class="px-3 py-2">Tokens</th>
                    <th class="px-3 py-2">Cache</th>
                    <th class="px-3 py-2">Rate limits</th>
                    <th class="px-3 py-2">Mappings</th>
                    <th class="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
                  <tr
                    v-for="cell in selectedRunDetail.cells"
                    :key="cell.cellIndex"
                  >
                    <td class="px-3 py-2">{{ cell.cellIndex }}</td>
                    <td class="px-3 py-2">
                      <span
                        class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                        :class="cellStatusClasses(cell)"
                      >
                        {{ formatLabel(cell.status) }}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      {{ formatScopeList(cell.controlKeys) }}
                    </td>
                    <td class="px-3 py-2">
                      {{ formatScopeList(cell.labelSetHashes) }}
                    </td>
                    <td class="px-3 py-2">
                      {{ formatNumber(cell.inputTokens) }} /
                      {{ formatNumber(cell.outputTokens) }}
                    </td>
                    <td class="px-3 py-2">
                      {{ formatNumber(cell.cacheReadInputTokens) }} read /
                      {{ formatNumber(cell.cacheCreationInputTokens) }} created
                    </td>
                    <td class="px-3 py-2">
                      {{ formatNumber(cell.rateLimitedCount) }}
                    </td>
                    <td class="px-3 py-2">
                      {{ formatNumber(cell.mappingsReturned) }} returned /
                      {{ formatNumber(cell.mappingsRejected) }} rejected
                    </td>
                    <td
                      class="max-w-sm px-3 py-2 text-red-700 dark:text-red-300"
                    >
                      {{ cell.error ?? 'None' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PageCard>

          <PageCard>
            <h4 class="text-base font-semibold text-gray-900 dark:text-white">
              Events
            </h4>
            <Message
              v-if="!selectedRunDetail.events.length"
              severity="info"
              variant="outlined"
              class="mt-3"
            >
              No run events found.
            </Message>
            <ol v-else class="mt-3 space-y-3">
              <li
                v-for="event in selectedRunDetail.events"
                :key="
                  event.id ?? event.uuid ?? `${event.action}-${event.createdAt}`
                "
                class="rounded-md border border-zinc-200 p-3 dark:border-slate-700"
              >
                <p class="font-semibold">{{ event.action ?? 'event' }}</p>
                <p class="text-sm text-zinc-500">
                  {{ event.actor ?? 'Unknown actor' }} ·
                  {{ formatDate(event.createdAt) }}
                </p>
                <p v-if="event.message" class="mt-2 text-sm">
                  {{ event.message }}
                </p>
                <p v-if="event.reasoning" class="mt-2 text-sm">
                  {{ event.reasoning }}
                </p>
              </li>
            </ol>
          </PageCard>
        </template>
      </div>
    </Drawer>
  </div>
</template>
