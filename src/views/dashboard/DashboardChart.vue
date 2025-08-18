<template>
  <ResultComplianceOverTimeChart :data="complianceChartData" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { type Filter } from '@/parsers/labelfilter.ts';
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts';
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue';
import type { ChartData } from 'chart.js';
import { useEvidenceStore } from '@/stores/evidence.ts';

const props = defineProps<{
  filter: Filter;
}>();

const evidenceStore = useEvidenceStore();
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
});

evidenceStore
  .getComplianceForSearch(
    props.filter,
    '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
  )
  .then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data, [
      'satisfied',
      'not-satisfied',
    ]);
  });
</script>
