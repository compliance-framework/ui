<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Risk } from '@/oscal';
import type { DataResponse } from '@/stores/types';
import { useSystemStore } from '@/stores/system';
import { getErrorStatus } from '@/utils/httpErrors';
import {
  buildRiskSeverityHeatmap,
  buildRiskStatusBreakdown,
  computeRiskAcceptanceMetrics,
  listOverdueRisks,
  listTopOpenRisks,
  normalizeRiskScoreTimeseries,
  type RiskScoreTimeseriesPoint,
} from '@/utils/risk-dashboard';
import { formatDate } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import LineChart from '@/ds/components/LineChart/LineChart.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import ProgressBar from '@/ds/components/ProgressBar/ProgressBar.vue';
import RiskMatrix from '@/ds/components/RiskMatrix/RiskMatrix.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { niceMax, timeFormatter } from '../evidence/trendSeries';
import { registerLink, riskBadge, riskDetailLink, risksTabs } from './risks';

/**
 * This System > Risks, Dashboard tab: the classic dashboard's six views of the system's risks.
 * Each count drills into the Register with the matching filters.
 */
const route = useRoute();
const api = useAuthenticatedInstance();
const systemStore = useSystemStore();

const systemId = String(route.params.systemId);
const systemName = computed(
  () => systemStore.system.securityPlan?.metadata.title ?? 'this system',
);
const base = `/api/oscal/system-security-plans/${systemId}/risks`;

const status = ref<QueryStatus>('loading');
const risks = ref<Risk[]>([]);

async function load(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Risk[]>>(base);
    risks.value = response.data.data ?? [];
    status.value = risks.value.length ? 'ready' : 'empty';
  } catch (error) {
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}
void load();

const link = (filters: Parameters<typeof registerLink>[1]) =>
  registerLink(systemId, filters);

const breakdown = computed(() =>
  buildRiskStatusBreakdown(risks.value).filter((item) => item.count > 0),
);
const heatmap = computed(() => buildRiskSeverityHeatmap(risks.value));
const matrixLevels = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
const overdue = computed(() =>
  listOverdueRisks(risks.value).map((item) => ({
    id: item.id,
    title: item.title,
    to: riskDetailLink(item.id),
    meta: `Review was due ${formatDate(item.reviewDeadline)}`,
  })),
);
const top = computed(() =>
  listTopOpenRisks(risks.value).map((item) => ({
    id: item.id,
    title: item.title,
    to: riskDetailLink(item.id),
    meta: `Likelihood ${item.likelihood} · impact ${item.impact}`,
  })),
);
const acceptance = computed(() => computeRiskAcceptanceMetrics(risks.value));

// Score trend ---------------------------------------------------------------------------------

const range = ref<'30' | '60' | '90'>('30');
const trendStatus = ref<QueryStatus>('loading');
const trend = ref<RiskScoreTimeseriesPoint[]>([]);

async function loadTrend(): Promise<void> {
  trendStatus.value = 'loading';
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Number(range.value) + 1);
  try {
    const response = await api.get<DataResponse<RiskScoreTimeseriesPoint[]>>(
      `${base}/score-timeseries`,
      {
        params: {
          from: from.toISOString(),
          to: to.toISOString(),
          bucket: 'day',
        },
      },
    );
    trend.value = normalizeRiskScoreTimeseries(response.data.data ?? []);
    trendStatus.value = trend.value.length ? 'ready' : 'empty';
  } catch {
    trendStatus.value = 'error';
  }
}
watch(range, () => void loadTrend(), { immediate: true });

const trendSeries = computed(() => [
  {
    name: 'Baseline score',
    points: trend.value.map((p) => ({
      x: p.bucketStart,
      y: p.openBaselineScore,
    })),
  },
  {
    name: 'Residual score',
    points: trend.value.map((p) => ({
      x: p.bucketStart,
      y: p.openResidualScore,
    })),
  },
]);
const trendMax = computed(() => niceMax(trendSeries.value));
const trendTime = computed(() => timeFormatter(trendSeries.value));
const rangeOptions = [
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
];
</script>

<template>
  <ListTemplate
    title="Risks"
    :description="`Risk posture for ${systemName}.`"
    :tabs="risksTabs(systemId)"
  >
    <DataState
      :status="status"
      subject="risks"
      empty-title="No risks yet"
      empty-body="A risk records something that could stop a control working, with how likely it is, how much it would matter, and what is being done about it. Add risks on the Register tab."
      icon="risks"
      skeleton="panel"
      @retry="load"
    >
      <Grid min="lg" gap="4">
        <Panel title="By status">
          <Stack gap="2" as="ul">
            <Cluster
              v-for="item in breakdown"
              :key="item.status"
              as="li"
              justify="between"
            >
              <TextLink :to="link({ status: item.status })">{{
                item.label
              }}</TextLink>
              <Cluster gap="2">
                <StatusBadge
                  v-if="riskBadge(item.status)"
                  :status="riskBadge(item.status)!"
                  compact
                />
                <Text as="span" variant="label">{{ item.count }}</Text>
              </Cluster>
            </Cluster>
          </Stack>
        </Panel>

        <Panel title="Severity">
          <RiskMatrix
            :levels="matrixLevels"
            :cells="heatmap.cells"
            :to="
              (likelihood, impact) =>
                link({ status: 'all', likelihood, impact })
            "
          />
        </Panel>

        <Panel title="Overdue reviews">
          <template #actions>
            <TextLink :to="link({ review: 'overdue' })">All overdue</TextLink>
          </template>
          <ItemList :items="overdue" empty-text="No reviews are overdue." />
        </Panel>

        <Panel title="Top open risks">
          <ItemList :items="top" empty-text="No open risks." />
        </Panel>

        <Panel title="Score trend">
          <template #actions>
            <Select v-model="range" :options="rangeOptions" label="Range" />
          </template>
          <DataState
            :status="trendStatus"
            subject="the score trend"
            empty-title="No trend yet"
            empty-body="Scores appear here as risks are assessed over time."
            heading-level="none"
            skeleton="panel"
            @retry="loadTrend"
          >
            <LineChart
              label="Open risks' baseline and residual scores over time"
              :series="trendSeries"
              y-label="Score"
              x-label="Date"
              :y-max="trendMax"
              :format-y="(v: number) => String(Math.round(v))"
              :format-x="trendTime"
            />
          </DataState>
        </Panel>

        <Panel title="Accepted or mitigated">
          <template #actions>
            <TextLink :to="link({ statusCategory: 'addressed' })"
              >Addressed risks</TextLink
            >
          </template>
          <ProgressBar
            label="Accepted or mitigation complete, of active risks"
            :value="acceptance.addressed"
            :max="acceptance.totalInScope"
            tone="success"
          />
        </Panel>
      </Grid>
    </DataState>
  </ListTemplate>
</template>
