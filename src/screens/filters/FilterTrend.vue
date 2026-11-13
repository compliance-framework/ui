<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Filter } from '@/parsers/labelfilter';
import type { ComplianceInterval } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import LineChart from '@/ds/components/LineChart/LineChart.vue';
import {
  STATUS_INTERVAL,
  niceMax,
  statusSeries,
  timeFormatter,
  type TrendSeries,
} from '../evidence/trendSeries';

/** Evidence status over time for one saved filter, as the classic filters page charted it. */
const props = defineProps<{ name: string; filter: Filter }>();

const api = useAuthenticatedInstance();
const status = ref<QueryStatus>('loading');
const series = ref<TrendSeries[]>([]);

async function load(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.post<DataResponse<ComplianceInterval[]>>(
      '/api/evidence/status-over-time',
      { filter: props.filter },
      { params: { interval: STATUS_INTERVAL } },
    );
    series.value = statusSeries(response.data.data ?? []);
    status.value = series.value.some((s) => s.points.length)
      ? 'ready'
      : 'empty';
  } catch {
    status.value = 'error';
  }
}
void load();

const yMax = computed(() => niceMax(series.value));
const formatX = computed(() => timeFormatter(series.value));
</script>

<template>
  <DataState
    :status="status"
    subject="this trend"
    empty-title="No evidence yet"
    empty-body="Nothing has matched this filter recently."
    skeleton="panel"
    @retry="load"
  >
    <LineChart
      :label="`Evidence status over time for ${name}`"
      :series="series"
      y-label="Evidence"
      x-label="Time"
      :y-max="yMax"
      :format-y="(value: number) => String(Math.round(value))"
      :format-x="formatX"
    />
  </DataState>
</template>
