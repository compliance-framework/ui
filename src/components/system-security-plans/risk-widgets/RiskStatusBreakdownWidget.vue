<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Risk Status Breakdown
      </h4>
      <button
        type="button"
        class="text-xs font-medium text-blue-600 underline dark:text-blue-300"
        @click="navigateToStatus('all')"
      >
        View all
      </button>
    </div>

    <div
      v-if="!statusItems.length"
      class="mt-4 text-sm text-gray-500 dark:text-slate-400"
    >
      No risk data available.
    </div>

    <template v-else>
      <div class="mt-4 h-44">
        <DoughnutChart
          :data="chartData"
          :options="chartOptions"
          @element-click="handleChartClick"
        />
      </div>

      <div class="mt-4 space-y-2">
        <button
          v-for="item in statusItems"
          :key="item.status"
          type="button"
          class="flex w-full items-center justify-between rounded-md border border-ccf-300 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
          @click="navigateToStatus(item.status)"
        >
          <span class="text-gray-700 dark:text-slate-300">{{
            item.label
          }}</span>
          <span class="font-semibold text-gray-900 dark:text-slate-100">
            {{ item.count }}
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import DoughnutChart from '@/components/charts/DoughnutChart.vue';
import type { RiskStatusBreakdownItem } from '@/utils/risk-dashboard';

const props = defineProps<{
  statusItems: RiskStatusBreakdownItem[];
}>();

const emit = defineEmits<{
  (event: 'navigate', query: Record<string, string>): void;
}>();

const chartColors = [
  '#2563eb',
  '#7c3aed',
  '#16a34a',
  '#ca8a04',
  '#dc2626',
  '#0f766e',
  '#475569',
];

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.statusItems.map((item) => item.label),
  datasets: [
    {
      data: props.statusItems.map((item) => item.count),
      backgroundColor: props.statusItems.map(
        (_, index) => chartColors[index % chartColors.length],
      ),
      borderWidth: 0,
    },
  ],
}));

const chartOptions: ChartOptions<'doughnut'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
};

function navigateToStatus(status: string) {
  if (status === 'all') {
    emit('navigate', {});
    return;
  }
  emit('navigate', { status });
}

function handleChartClick(index: number) {
  const selected = props.statusItems[index];
  if (!selected) return;
  navigateToStatus(selected.status);
}
</script>
