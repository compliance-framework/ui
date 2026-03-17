<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Risk Trend
        </h4>
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Risks created over time
        </p>
      </div>
      <SelectButton
        :model-value="rangeDays"
        :options="rangeOptions"
        option-label="label"
        option-value="value"
        @update:model-value="onRangeUpdate"
      />
    </div>

    <div
      v-if="!points.length"
      class="mt-4 text-sm text-gray-500 dark:text-slate-400"
    >
      No risk trend data.
    </div>

    <div v-else class="mt-4 h-44">
      <LineChart
        :data="chartData"
        :options="chartOptions"
        @element-click="navigateFromPointIndex"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import LineChart from '@/components/charts/LineChart.vue';
import SelectButton from '@/volt/SelectButton.vue';
import type { RiskTrendPoint } from '@/utils/risk-dashboard';

const props = defineProps<{
  rangeDays: 30 | 60 | 90;
  points: RiskTrendPoint[];
}>();

const emit = defineEmits<{
  (event: 'update:range-days', value: 30 | 60 | 90): void;
  (event: 'navigate', query: Record<string, string>): void;
}>();

const rangeOptions: Array<{ label: string; value: 30 | 60 | 90 }> = [
  { label: '30D', value: 30 },
  { label: '60D', value: 60 },
  { label: '90D', value: 90 },
];

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.points.map((point) => point.date),
  datasets: [
    {
      label: 'Created risks',
      data: props.points.map((point) => point.count),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.16)',
      pointRadius: 3,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: true,
    },
  ],
}));

const chartOptions: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
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
  emit('update:range-days', next);
}

function navigateFromPointIndex(index: number) {
  const point = props.points[index];
  if (!point) return;
  emit('navigate', {
    status: 'all',
    createdFrom: point.createdFrom,
    createdTo: point.createdTo,
  });
}
</script>
