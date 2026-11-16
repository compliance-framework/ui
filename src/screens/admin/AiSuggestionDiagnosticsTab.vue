<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import LineChart from '@/ds/components/LineChart/LineChart.vue';
import MetricTile from '@/ds/components/MetricTile/MetricTile.vue';
import Select from '@/ds/components/Select/Select.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Text from '@/ds/components/Text/Text.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useAiConfigStore } from '@/stores/ai-config';
import { useAiDiagnostics } from '@/composables/useAiDiagnostics';
import AiSuggestionRunDetail from './AiSuggestionRunDetail.vue';
import {
  buildAiDiagnosticsCacheHitSeries,
  buildAiDiagnosticsTokenSeries,
  checkStatusKey,
  formatDate,
  formatDuration,
  formatLabel,
  formatNumber,
  formatPercent,
  niceAxisMax,
  runStatusKey,
  type AiDiagnosticsRun,
  type AiDiagnosticsRunsFilters,
} from './aiDiagnostics';

/**
 * Diagnostics > AI suggestions (/admin/diagnostics/ai-suggestions, admin, when AI is
 * configured): totals, health checks, configuration, the suggestion queue and trends on
 * Overview; the run history with each run's cells and events on Runs (?tab=runs).
 */
const aiConfig = useAiConfigStore();
const route = useRoute();
const statusFilter = ref('');
const sspFilter = ref('');
const limitFilter = ref(50);
const autoRefresh = ref(false);
const hasCompletedInitialConfigLoad = ref(false);
const showRunDrawer = ref(false);
const selectedRunId = ref<string | null>(null);
const activeTab = computed<'overview' | 'runs'>(() =>
  route.query.tab === 'runs' ? 'runs' : 'overview',
);
const tabs = [
  { label: 'Overview', to: { query: {} } },
  { label: 'Runs', to: { query: { tab: 'runs' } } },
];

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
  { label: 'Pending', value: 'pending' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const limitOptions = [25, 50, 100, 200].map((limit) => ({
  value: String(limit),
  label: String(limit),
}));

/** Select works on strings; the filter keeps a number. */
const limitModel = computed({
  get: () => String(limitFilter.value),
  set: (value: string) => {
    limitFilter.value = Number(value);
  },
});

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

const tokenSeries = computed(() =>
  buildAiDiagnosticsTokenSeries(runsNewestFirst.value),
);
const cacheHitSeries = computed(() =>
  buildAiDiagnosticsCacheHitSeries(runsNewestFirst.value),
);
const tokenAxisMax = computed(() =>
  niceAxisMax(
    Math.max(
      0,
      ...tokenSeries.value.flatMap((series) =>
        series.points.map((point) => point.y),
      ),
    ),
  ),
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

const runSegments = computed(() => {
  const byStatus = summary.value?.totals.runsByStatus;
  return (['completed', 'failed', 'running', 'pending'] as const).map(
    (status) => ({
      status: runStatusKey(status),
      count: byStatus?.[status] ?? 0,
    }),
  );
});

const configItems = computed(() => {
  const config = summary.value?.config;
  return [
    { key: 'model', label: 'Model', value: config?.model },
    { key: 'prompt', label: 'Prompt version', value: config?.promptVersion },
    {
      key: 'controls',
      label: 'Controls per chunk',
      value: config?.maxControlsPerChunk,
    },
    {
      key: 'labelSets',
      label: 'Label sets per chunk',
      value: config?.maxLabelSetsPerChunk,
    },
    { key: 'calls', label: 'Max calls per run', value: config?.maxCallsPerRun },
    { key: 'workers', label: 'Queue workers', value: config?.queueWorkers },
  ];
});

const queueItems = computed(() => {
  const queue = summary.value?.queue;
  return [
    {
      key: 'available',
      label: 'Available',
      value: formatNumber(queue?.available),
    },
    { key: 'running', label: 'Running', value: formatNumber(queue?.running) },
    {
      key: 'retryable',
      label: 'Retryable',
      value: formatNumber(queue?.retryable),
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: formatNumber(queue?.scheduled),
    },
  ];
});

const runColumns: DataTableColumn[] = [
  { key: 'ssp', label: 'SSP', minWidth: 'sm' },
  { key: 'startedAt', label: 'Started', nowrap: true },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'cells', label: 'Cells', nowrap: true },
  { key: 'tokens', label: 'Input/output', nowrap: true },
  { key: 'cacheHitRatio', label: 'Cache hit %', align: 'end' },
  { key: 'rateLimitedTotal', label: 'Rate-limited', align: 'end' },
  { key: 'model', label: 'Model' },
  { key: 'durationMs', label: 'Duration', nowrap: true },
  { key: 'triggeredBy', label: 'Triggered by' },
];

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
  selectedRunId.value = run.id;
  showRunDrawer.value = true;
  await fetchRunDetail(run.id);
}

function retryRunDetail() {
  if (selectedRunId.value) {
    void fetchRunDetail(selectedRunId.value);
  }
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

watch(autoRefresh, toggleAutoRefresh);
// The selects apply as soon as one changes; the SSP search applies on Enter or Search.
watch([statusFilter, limitFilter], () => void applyFilters());
</script>

<template>
  <DataState
    v-if="!aiConfig.dashboardSuggestionsConfigFetched"
    status="loading"
    subject="the AI suggestions configuration"
    skeleton="panel"
  />

  <InlineMessage
    v-else-if="!aiConfig.dashboardSuggestionsEnabled"
    tone="info"
    title="AI suggestions are off"
  >
    AI is not configured, so AI suggestions diagnostics are unavailable.
  </InlineMessage>

  <Stack v-else gap="section">
    <InlineMessage
      v-if="summaryError || runsError"
      tone="warning"
      title="Some AI diagnostics didn't load"
    >
      {{ summaryError || runsError }}
    </InlineMessage>

    <Tabs label="AI suggestion diagnostics: sections" :tabs="tabs">
      <Stack v-if="activeTab === 'overview'" gap="section">
        <Panel
          title="AI suggestions"
          description="Run history, token usage, cache health, and suggestion outcomes."
        >
          <template #actions>
            <Checkbox v-model="autoRefresh" label="Auto-refresh" />
            <Button
              icon="refresh"
              :loading="summaryLoading || runsLoading"
              @click="refreshAll"
              >Refresh</Button
            >
          </template>
          <DataState
            :status="summary ? 'ready' : summaryLoading ? 'loading' : 'empty'"
            subject="AI diagnostics totals"
            empty-title="No AI diagnostics summary yet"
            :heading-level="3"
            skeleton="panel"
          >
            <Grid v-if="summary" min="sm" gap="3">
              <MetricTile
                label="Runs"
                :value="formatNumber(summary.totals.runs)"
                :segments="runSegments"
              />
              <MetricTile
                label="Cell success"
                :value="formatPercent(cellSuccessRate)"
                :description="`${formatNumber(summary.totals.cellsCompleted)} complete · ${formatPercent(failedCellsRate)} failed`"
              />
              <MetricTile
                label="Tokens"
                :value="`${formatNumber(summary.totals.inputTokens)} / ${formatNumber(summary.totals.outputTokens)}`"
                description="Input / output tokens"
              />
              <MetricTile
                label="Cache hit ratio"
                :value="formatPercent(summary.totals.cacheHitRatio)"
                :description="`Read ${formatNumber(summary.totals.cacheReadInputTokens)} · Created ${formatNumber(summary.totals.cacheCreationInputTokens)}`"
              />
              <MetricTile
                label="Suggestions accepted"
                :value="formatNumber(summary.totals.suggestionsAccepted)"
                :description="`${formatNumber(summary.totals.suggestionsRejected)} rejected · ${formatNumber(summary.totals.suggestionsPending)} pending`"
              />
              <MetricTile
                label="Rate limited"
                :value="formatNumber(summary.totals.rateLimitedTotal)"
                description="Total rate-limit retries"
              />
              <MetricTile
                label="Mappings"
                :value="formatNumber(summary.totals.mappingsReturned)"
                :description="`${formatNumber(summary.totals.mappingsRejected)} rejected`"
              />
            </Grid>
          </DataState>
        </Panel>

        <template v-if="summary">
          <Panel title="Health checks">
            <Text v-if="summary.checks.length === 0" variant="secondary"
              >No health checks returned.</Text
            >
            <PanelSection
              v-for="check in summary.checks"
              :key="check.id"
              :title="formatLabel(check.id)"
            >
              <template #actions>
                <StatusBadge :status="checkStatusKey(check.status)" />
              </template>
              <Stack gap="2">
                <Text>{{ check.message }}</Text>
                <ul v-if="check.recommendedActions?.length">
                  <li v-for="action in check.recommendedActions" :key="action">
                    {{ action }}
                  </li>
                </ul>
              </Stack>
            </PanelSection>
          </Panel>

          <Panel title="Configuration">
            <DescriptionList :items="configItems" />
          </Panel>

          <Panel
            v-if="summary.queue"
            title="Suggestion queue"
            :description="`${summary.queue.name} · oldest available ${formatDate(summary.queue.oldestAvailableAt)}`"
          >
            <template #actions>
              <Button
                variant="tertiary"
                :to="{ name: 'admin-diagnostics-notifications' }"
                >Open notifications</Button
              >
            </template>
            <DescriptionList :items="queueItems" />
          </Panel>

          <Grid min="lg" gap="4">
            <Panel title="Token usage">
              <LineChart
                v-if="tokenSeries[0]?.points.length"
                label="Tokens per run start day"
                :series="tokenSeries"
                y-label="Tokens"
                x-label="Run start day"
                :y-max="tokenAxisMax"
                :format-y="formatNumber"
              />
              <Text v-else variant="secondary"
                >No run token data is loaded yet.</Text
              >
            </Panel>
            <Panel title="Cache hit trend">
              <LineChart
                v-if="cacheHitSeries[0]?.points.length"
                label="Average cache hit per run start day"
                :series="cacheHitSeries"
                y-label="Cache hit"
                x-label="Run start day"
              />
              <Text v-else variant="secondary"
                >No run cache data is loaded yet.</Text
              >
            </Panel>
          </Grid>
        </template>
      </Stack>

      <Panel
        v-else
        title="Runs"
        description="AI suggestion runs, newest first."
      >
        <template #actions>
          <Checkbox v-model="autoRefresh" label="Auto-refresh" />
          <Button
            icon="refresh"
            :loading="summaryLoading || runsLoading"
            @click="refreshAll"
            >Refresh</Button
          >
        </template>
        <Stack gap="4">
          <FilterBar
            v-model:query="sspFilter"
            label="Filter runs"
            search-label="SSP ID"
            search-placeholder="All SSPs"
            @search="applyFilters"
          >
            <FormField label="Status">
              <Select
                v-model="statusFilter"
                :options="statusOptions"
                placeholder="All statuses"
              />
            </FormField>
            <FormField label="Limit">
              <Select v-model="limitModel" :options="limitOptions" />
            </FormField>
          </FilterBar>

          <DataState
            :status="
              runsError
                ? 'error'
                : runsLoading && !runs.length
                  ? 'loading'
                  : runsNewestFirst.length
                    ? 'ready'
                    : 'empty'
            "
            subject="AI suggestion runs"
            empty-title="No AI suggestion runs match the current filters"
            :error-message="runsError ?? undefined"
            :heading-level="3"
            @retry="applyFilters"
          >
            <Stack gap="4" align="start">
              <DataTable
                caption="AI suggestion runs"
                caption-hidden
                :columns="runColumns"
                :rows="runsNewestFirst"
                :row-key="(run) => run.id"
              >
                <template #cell-ssp="{ row }">
                  <Button
                    variant="tertiary"
                    size="sm"
                    wrap
                    @click="openRunDetail(row)"
                    >{{ row.sspName || row.sspId || 'N/A' }}</Button
                  >
                </template>
                <template #cell-startedAt="{ row }">{{
                  formatDate(row.startedAt)
                }}</template>
                <template #cell-status="{ row }">
                  <StatusBadge :status="runStatusKey(row.status)" />
                </template>
                <template #cell-cells="{ row }"
                  >{{ formatNumber(row.completedCells) }}/{{
                    formatNumber(row.plannedCalls)
                  }}<template v-if="row.failedCells">
                    ({{ formatNumber(row.failedCells) }} failed)</template
                  ></template
                >
                <template #cell-tokens="{ row }"
                  >{{ formatNumber(row.inputTokens) }} /
                  {{ formatNumber(row.outputTokens) }}</template
                >
                <template #cell-cacheHitRatio="{ row }">{{
                  formatPercent(row.cacheHitRatio)
                }}</template>
                <template #cell-rateLimitedTotal="{ row }">{{
                  formatNumber(row.rateLimitedTotal)
                }}</template>
                <template #cell-model="{ row }">{{
                  row.model ?? 'N/A'
                }}</template>
                <template #cell-durationMs="{ row }">{{
                  formatDuration(row.durationMs)
                }}</template>
                <template #cell-triggeredBy="{ row }">{{
                  row.triggeredBy?.name ?? 'System'
                }}</template>
              </DataTable>
              <Button
                v-if="nextCursor"
                :loading="runsLoading || paginationLoading"
                @click="loadMore"
                >Load more</Button
              >
              <InlineMessage
                v-if="paginationError"
                tone="error"
                title="We couldn't load more runs."
              >
                {{ paginationError }}
              </InlineMessage>
            </Stack>
          </DataState>
        </Stack>
      </Panel>
    </Tabs>

    <Drawer v-model:open="showRunDrawer" title="AI suggestion run">
      <DataState
        :status="
          runDetailError
            ? 'error'
            : runDetailLoading || !selectedRunDetail
              ? 'loading'
              : 'ready'
        "
        subject="the run details"
        :error-message="runDetailError ?? undefined"
        skeleton="panel"
        :heading-level="3"
        @retry="retryRunDetail"
      >
        <AiSuggestionRunDetail
          v-if="selectedRunDetail"
          :run="selectedRunDetail"
        />
      </DataState>
    </Drawer>
  </Stack>
</template>
