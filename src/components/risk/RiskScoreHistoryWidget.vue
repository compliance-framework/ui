<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-4"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
          Risk Score History
        </h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Baseline and residual score snapshots
        </p>
      </div>

      <div v-if="latestSnapshot" class="flex flex-wrap gap-2 text-xs">
        <span
          class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
        >
          Baseline {{ latestSnapshot.baselineScore }}
        </span>
        <span
          class="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
        >
          Residual {{ latestSnapshot.residualScore }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-600 dark:text-slate-400">
      Loading risk score history...
    </div>

    <div v-else-if="error" class="text-sm text-red-600 dark:text-red-300">
      Unable to load risk score history.
    </div>

    <div
      v-else-if="!snapshots.length"
      class="text-sm text-gray-600 dark:text-slate-400"
    >
      No risk score history has been recorded for this risk.
    </div>

    <template v-else>
      <div class="h-52">
        <LineChart :data="chartData" :options="chartOptions" />
      </div>

      <div
        v-if="latestSnapshot"
        class="grid grid-cols-1 gap-3 text-sm md:grid-cols-4"
      >
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">
            Likelihood
          </p>
          <p class="font-medium text-gray-900 dark:text-slate-100">
            {{ formatTokenLabel(latestSnapshot.likelihood) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">Impact</p>
          <p class="font-medium text-gray-900 dark:text-slate-100">
            {{ formatTokenLabel(latestSnapshot.impact) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">
            Last Snapshot
          </p>
          <p class="font-medium text-gray-900 dark:text-slate-100">
            {{ formatDate(latestSnapshot.occurredAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">Event</p>
          <p class="font-medium text-gray-900 dark:text-slate-100">
            {{ formatTokenLabel(latestSnapshot.sourceEventType) }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import LineChart from '@/components/charts/LineChart.vue';
import type { RiskScoreSnapshot } from '@/utils/risk-dashboard';

const props = defineProps<{
  snapshots: RiskScoreSnapshot[];
  loading?: boolean;
  error?: boolean;
}>();

const sortedSnapshots = computed(() =>
  [...props.snapshots].sort((left, right) => {
    const leftTime = Date.parse(left.occurredAt);
    const rightTime = Date.parse(right.occurredAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  }),
);

const latestSnapshot = computed(
  () => sortedSnapshots.value[sortedSnapshots.value.length - 1] || null,
);

const chartData = computed<ChartData<'line'>>(() => ({
  labels: sortedSnapshots.value.map((snapshot) =>
    snapshot.occurredAt.slice(0, 10),
  ),
  datasets: [
    {
      label: 'Baseline Score',
      data: sortedSnapshots.value.map((snapshot) => snapshot.baselineScore),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      pointRadius: 3,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
    },
    {
      label: 'Residual Score',
      data: sortedSnapshots.value.map((snapshot) => snapshot.residualScore),
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

function formatTokenLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value?: string): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
</script>
