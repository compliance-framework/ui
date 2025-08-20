<template>
  <ResultComplianceOverTimeChart :data="complianceChartData" />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { type Filter } from '@/parsers/labelfilter.ts'
import { calculateComplianceOverTimeData, type DateDataPoint} from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import type { ChartData } from 'chart.js'
import type { ComplianceInterval } from '@/stores/evidence.ts'
import { useDataApi } from '@/composables/axios'

const props = defineProps<{
  filter: Filter
}>()

const { data: complianceOverTime } = useDataApi<ComplianceInterval[]>('/api/evidence/status-over-time',
  {
    params: {
      interval: '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
    },
    data: {
      filter: props.filter,
    },
    method: 'POST',
  }
);
const complianceChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateComplianceOverTimeData(
    complianceOverTime.value ?? [],
    ['satisfied', 'not-satisfied'],
  );
});
</script>
