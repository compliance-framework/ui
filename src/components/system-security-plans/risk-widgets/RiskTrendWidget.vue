<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Risk Score Trend
        </h4>
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Open baseline and residual scores over time
        </p>
      </div>
      <SelectButton
        :model-value="selectedRangeDays"
        :options="rangeOptions"
        option-label="label"
        option-value="value"
        @update:model-value="onRangeUpdate"
      />
    </div>

    <div v-if="loading" class="mt-4 text-sm text-gray-500 dark:text-slate-400">
      Loading risk score trend...
    </div>

    <div v-else-if="error" class="mt-4 text-sm text-red-600 dark:text-red-300">
      Unable to load risk score trend.
    </div>

    <div
      v-else-if="!normalizedPoints.length"
      class="mt-4 text-sm text-gray-500 dark:text-slate-400"
    >
      No risk score trend data.
    </div>

    <div v-else class="mt-4 h-44">
      <LineChart :data="chartData" :options="chartOptions" />
    </div>

    <div
      v-if="latestPoint && !loading && !error"
      class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"
    >
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
        <p class="text-xs uppercase tracking-wide text-gray-500">
          Open Baseline Score
        </p>
        <p class="mt-1 font-semibold text-gray-900 dark:text-slate-100">
          {{ latestPoint.openBaselineScore }}
        </p>
      </div>
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
        <p class="text-xs uppercase tracking-wide text-gray-500">
          Open Residual Score
        </p>
        <p class="mt-1 font-semibold text-gray-900 dark:text-slate-100">
          {{ latestPoint.openResidualScore }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import LineChart from '@/components/charts/LineChart.vue';
import SelectButton from '@/volt/SelectButton.vue';
import { useDataApi } from '@/composables/axios';
import {
  normalizeRiskScoreTimeseries,
  type RiskScoreTimeseriesPoint,
} from '@/utils/risk-dashboard';

const props = defineProps<{
  endpoint: string | null;
  initialRangeDays?: 30 | 60 | 90;
}>();

const rangeOptions: Array<{ label: string; value: 30 | 60 | 90 }> = [
  { label: '30D', value: 30 },
  { label: '60D', value: 60 },
  { label: '90D', value: 90 },
];

const selectedRangeDays = ref<30 | 60 | 90>(props.initialRangeDays || 30);

const {
  data: scoreTrend,
  error,
  isLoading: loading,
  execute: loadScoreTrend,
} = useDataApi<RiskScoreTimeseriesPoint[]>(null, {}, { immediate: false });

function rangeEndpoint(endpoint: string, rangeDays: 30 | 60 | 90): string {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - rangeDays + 1);

  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    bucket: 'day',
  });

  return `${endpoint}?${params.toString()}`;
}

const requestEndpoint = computed(() => {
  if (!props.endpoint) return null;
  return rangeEndpoint(props.endpoint, selectedRangeDays.value);
});

watch(
  requestEndpoint,
  async (endpoint) => {
    if (!endpoint) {
      scoreTrend.value = [];
      error.value = undefined;
      return;
    }
    error.value = undefined;
    try {
      await loadScoreTrend(endpoint);
    } catch {
      // Error state is exposed through useDataApi().error.
    }
  },
  { immediate: true },
);

const normalizedPoints = computed(() =>
  normalizeRiskScoreTimeseries(scoreTrend.value || []),
);

const latestPoint = computed(
  () => normalizedPoints.value[normalizedPoints.value.length - 1] || null,
);

const chartData = computed<ChartData<'line'>>(() => ({
  labels: normalizedPoints.value.map((point) => point.bucketStart.slice(0, 10)),
  datasets: [
    {
      label: 'Open Baseline Score',
      data: normalizedPoints.value.map((point) => point.openBaselineScore),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      pointRadius: 3,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
    },
    {
      label: 'Open Residual Score',
      data: normalizedPoints.value.map((point) => point.openResidualScore),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      pointRadius: 3,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
    },
  ],
}));

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

function onRangeUpdate(next: 30 | 60 | 90) {
  selectedRangeDays.value = next;
}
</script>
