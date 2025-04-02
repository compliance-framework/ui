<template>
  <PageHeader>
    Finding History
  </PageHeader>
  <PageSubHeader>
    {{ uuid }}
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
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </div>
  </div>
  <PageCard class="mt-4">
    <div
      class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"
      v-for="finding in findings"
      :key="finding.uuid"
    >
      <div class="shrink-0 pr-4">
        <ResultStatusRing :state="finding.status.state?.toLowerCase()"></ResultStatusRing>
      </div>
      <div class="w-1/3">{{ finding.title }}</div>
      <div>
        <RouterLink
          class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"
          :to="{ name: 'finding-view', params: { id: finding._id } }"
        >View</RouterLink>
      </div>
    </div>
  </PageCard>
</template>
<script setup lang="ts">
import {  onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { type DataResponse } from '@/stores/api.ts'
import type { ChartData } from 'chart.js'
import {
  calculateComplianceOverTimeData, type DateDataPoint
} from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { type Finding, useFindingsStore } from '@/stores/findings.ts'
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts'
import { useHeartbeatsStore } from '@/stores/heartbeats.ts'

const route = useRoute()
const findingStore = useFindingsStore()
const heartbeatStore = useHeartbeatsStore()

const uuid = route.params.uuid as string;
const findings = ref<Finding[]>([] as Finding[])
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})
const heartbeatChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

onMounted(() => {
  findingStore.history(uuid).then((resultList: DataResponse<Finding[]>) => {
    findings.value = resultList.data;
  })

  findingStore.getComplianceForUUID(uuid).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data)
    // uptimeChartData.value = calculateAgentUptimeData(response.data)
  })

  heartbeatStore.overTime().then((response) => {
    heartbeatChartData.value = calculateHeartbeatOverTimeData(response.data)
  })
})
</script>
