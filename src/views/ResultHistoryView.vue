<template>
  <PageHeader>
    Result History
  </PageHeader>
  <PageSubHeader>
    {{ streamId }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>
      </div>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </div>
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Agent health</h3>
      </div>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="uptimeChartData" />
      </div>
    </div>
  </div>
  <PageCard class="mt-4">
    <div
      class="grid grid-cols-3 gap-4 border-t first:border-none hover:bg-zinc-100 py-2"
      :to="{ name: 'assessment-plan-result', params: { id: result.uuid } }"
      v-for="result in results"
      :key="result.uuid"
    >
      <div class="pl-2">{{ result.start }}</div>
      <div class="">
        <ResultStatusBadge
          :gray="result.observations.length"
          :red="result.findings.filter(finding => finding.target.status.state?.toLowerCase() == 'open').length"
          :green="result.findings.filter(finding => finding.target.status.state?.toLowerCase() != 'open').length"
        ></ResultStatusBadge>
      </div>
      <div>
        <RouterLink
          class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"
          :to="{ name: 'assessment-plan-result', params: { id: result.uuid } }"
        >View</RouterLink>
      </div>
      <!--        <div class="px-2 py-2 flex-1">{{ assessment.title }}</div>-->
      <!--        <div class="px-2 w-1/5 h-8">-->
      <!--          <LineChart-->
      <!--            :options="{-->
      <!--              plugins: {-->
      <!--                tooltip: {-->
      <!--                  enabled: false,-->
      <!--                },-->
      <!--              },-->
      <!--              elements: {-->
      <!--                point: {-->
      <!--                  hoverRadius: 0,-->
      <!--                  hitRadius: 0,-->
      <!--                },-->
      <!--              },-->
      <!--            }"-->
      <!--            :data="assessment.data"-->
      <!--          />-->
      <!--        </div>-->
    </div>
  </PageCard>
</template>
<script setup lang="ts">
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import {  onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useApiStore, type Result, type DataResponse } from '@/stores/api.ts'
import type { ChartData } from 'chart.js'
import {
  calculateAgentUptimeData,
  calculateComplianceOverTimeData, type DateDataPoint
} from '@/parsers/results.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import ResultStatusBadge from '@/components/ResultStatusBadge.vue'

const route = useRoute()
const apiStore = useApiStore()

const streamId = route.params.stream as string;
const results = ref<Result[]>([] as Result[])
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})
const uptimeChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

onMounted(() => {
  apiStore.getStreamResults(streamId).then((resultList: DataResponse<Result[]>) => {
    results.value = resultList.data;
  })

  apiStore.getComplianceForStream(streamId).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data)
    uptimeChartData.value = calculateAgentUptimeData(response.data)
  })
})
</script>
