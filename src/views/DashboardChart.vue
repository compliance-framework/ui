<template>
  <ResultComplianceOverTimeChart :data="complianceChartData" />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { type Filter } from '@/parsers/labelfilter.ts'
import { calculateComplianceOverTimeData, type DateDataPoint } from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import { useFindingsStore } from '@/stores/findings.ts'
import type { ChartData } from 'chart.js'

const props = defineProps<{
  filter: Filter
}>()

const findingsStore = useFindingsStore()
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

findingsStore.getComplianceForSearch(props.filter).then((response) => {
  complianceChartData.value = calculateComplianceOverTimeData(response.data)
})
</script>
