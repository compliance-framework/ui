<template>
  <PageHeader>
    Evidence History
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
        v-for="item in evidence"
        :key="item.id"
      >
        <td class="py-2 pl-4 pr-2 w-[1%]">
          <ResultStatusRing
            :state="item.status.state?.toLowerCase()"
          ></ResultStatusRing>
        </td>
        <td class="py-3 px-2 whitespace-nowrap grow">{{ item.title }} <span class="text-sm dark:text-slate-400 ml-12">{{ new Date(item.end).toLocaleString() }}</span></td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 border-ccf-300 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'evidence:view', params: { id: item.id } }"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import PageCard from '@/components/PageCard.vue'
import type { ChartData } from 'chart.js'
import {
  calculateComplianceOverTimeData, type DateDataPoint
} from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts'
import type { HeartbeatInterval } from '@/stores/heartbeats.ts'
import type { Evidence,  ComplianceInterval } from '@/stores/evidence.ts'
import { useDataApi } from '@/composables/axios'

const route = useRoute()

const uuid = route.params.uuid as string;

const { data: evidence } = useDataApi<Evidence[]>(`/api/evidence/history/${uuid}`);
const { data: complianceOverTime } = useDataApi<ComplianceInterval[]>(`/api/evidence/status-over-time/${uuid}`,
  {
    params: {
      interval: '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
    },
    method: 'GET',
  }
);
const complianceChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateComplianceOverTimeData(
    complianceOverTime.value ?? [],
    ['satisfied', 'not-satisfied'],
  );
});

const { data: heartbeats } = useDataApi<HeartbeatInterval[]>('/api/agent/heartbeat/over-time',
  {
    method: 'GET',
  }
);
const heartbeatChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateHeartbeatOverTimeData(heartbeats.value ?? []);
});
</script>
