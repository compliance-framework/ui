<template>
  <PageHeader>
    Finding History
  </PageHeader>
  <PageSubHeader>
    {{ uuid }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Compliance over time
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Agent health
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </PageCard>
  </div>
  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-700"
        v-for="finding in findings"
        :key="finding.uuid"
      >
        <td class="py-2 pl-4 pr-2 w-[1%]">
          <ResultStatusRing
            :state="finding.status.state?.toLowerCase()"
          ></ResultStatusRing>
        </td>
        <td class="py-3 px-2 whitespace-nowrap grow">{{ finding.title }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 border-ccf-300 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'finding-view', params: { id: finding._id } }"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
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
import LabelList from '@/components/LabelList.vue'

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
