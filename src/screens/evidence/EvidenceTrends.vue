<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Filter } from '@/parsers/labelfilter';
import type { ComplianceInterval } from '@/stores/evidence';
import type { HeartbeatInterval } from '@/stores/heartbeats';
import type { DataResponse } from '@/stores/types';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import LineChart from '@/ds/components/LineChart/LineChart.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import {
  STATUS_INTERVAL,
  heartbeatSeries,
  niceMax,
  statusSeries,
  timeFormatter,
  type TrendSeries,
} from './trendSeries';

/**
 * The two trends from the classic evidence page, side by side: evidence status over time for the
 * applied search, and agent health (agents answering heartbeats). Each panel has its
 * own loading, empty and error state, so one failing never hides the other.
 */
const props = defineProps<{
  /** The scoped status-over-time endpoint. */
  endpoint: string;
  /** The applied search, as sent to the search endpoint. */
  request: { body: { filter: Filter }; name?: string };
}>();

const api = useAuthenticatedInstance();

interface Trend {
  status: QueryStatus;
  series: TrendSeries[];
}
const status = ref<Trend>({ status: 'loading', series: [] });
const health = ref<Trend>({ status: 'loading', series: [] });

const hasPoints = (series: TrendSeries[]) =>
  series.some((s) => s.points.length > 0);

let latest = 0;
async function loadStatus(): Promise<void> {
  const request = ++latest;
  status.value = { status: 'loading', series: [] };
  try {
    const response = await api.post<DataResponse<ComplianceInterval[]>>(
      props.endpoint,
      props.request.body,
      {
        params: {
          interval: STATUS_INTERVAL,
          ...(props.request.name ? { name: props.request.name } : {}),
        },
      },
    );
    if (request !== latest) return;
    const series = statusSeries(response.data.data ?? []);
    status.value = { status: hasPoints(series) ? 'ready' : 'empty', series };
  } catch {
    if (request === latest) status.value = { status: 'error', series: [] };
  }
}

async function loadHealth(): Promise<void> {
  health.value = { status: 'loading', series: [] };
  try {
    const response = await api.get<DataResponse<HeartbeatInterval[]>>(
      '/api/agent/heartbeat/over-time',
    );
    const series = heartbeatSeries(response.data.data ?? []);
    health.value = { status: hasPoints(series) ? 'ready' : 'empty', series };
  } catch {
    health.value = { status: 'error', series: [] };
  }
}

watch(
  () => JSON.stringify(props.request),
  () => void loadStatus(),
  { immediate: true },
);
void loadHealth();

const statusMax = computed(() => niceMax(status.value.series));
const healthMax = computed(() => niceMax(health.value.series));
const formatCount = (value: number) => String(Math.round(value));
const statusTime = computed(() => timeFormatter(status.value.series));
const healthTime = computed(() => timeFormatter(health.value.series));
</script>

<template>
  <Grid min="lg">
    <Panel
      title="Status over time"
      description="Satisfied and not satisfied evidence for this search, over time."
    >
      <DataState
        :status="status.status"
        subject="the status trend"
        empty-title="No status trend yet"
        empty-body="Evidence matching this search will show here as it arrives."
        heading-level="none"
        skeleton="panel"
        @retry="loadStatus"
      >
        <LineChart
          label="Evidence status over time for this search"
          :series="status.series"
          y-label="Evidence"
          x-label="Time"
          :y-max="statusMax"
          :format-y="formatCount"
          :format-x="statusTime"
        />
      </DataState>
    </Panel>
    <Panel
      title="Agent health"
      description="Agents answering the API's heartbeats, across all systems."
    >
      <DataState
        :status="health.status"
        subject="agent health"
        empty-title="No heartbeats yet"
        empty-body="Agents appear here once they start answering heartbeats."
        heading-level="none"
        skeleton="panel"
        @retry="loadHealth"
      >
        <LineChart
          label="Agents responding to heartbeats over time"
          :series="health.series"
          y-label="Agents"
          x-label="Time"
          :y-max="healthMax"
          :format-y="formatCount"
          :format-x="healthTime"
        />
      </DataState>
    </Panel>
  </Grid>
</template>
