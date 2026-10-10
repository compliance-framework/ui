<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import type { Chart } from 'chart.js';
import { ref } from 'vue';
import { useCharts } from './chart-defaults';

useCharts();

const props = defineProps(['data', 'options']);
const emit = defineEmits<{
  (event: 'element-click', index: number): void;
}>();

const chartRef = ref<{ chart: Chart<'doughnut'> } | null>(null);

function onChartClick(event: MouseEvent) {
  const chart = chartRef.value?.chart;
  if (!chart) return;

  const points = chart.getElementsAtEventForMode(
    event,
    'nearest',
    { intersect: true },
    true,
  );

  if (!points.length) return;
  emit('element-click', points[0].index);
}
</script>

<template>
  <Doughnut
    ref="chartRef"
    :options="props.options"
    :data="props.data"
    @click="onChartClick"
  />
</template>
