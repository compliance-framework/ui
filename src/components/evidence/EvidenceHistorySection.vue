<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
      class="rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
    >
      <template v-if="historyLoading">
        <div class="p-4 text-sm text-gray-600 dark:text-slate-400">
          Loading evidence history...
        </div>
      </template>

      <Message
        v-else-if="historyError"
        severity="error"
        variant="outlined"
        class="m-4"
      >
        Failed to load evidence history for this stream.
      </Message>

      <template v-else-if="!historyItems.length">
        <div class="p-4 text-sm text-gray-600 dark:text-slate-400">
          No history is available for this evidence stream.
        </div>
      </template>

      <table v-else class="table-auto w-full rounded-full dark:text-slate-300">
        <tbody>
          <tr
            v-for="item in paginatedHistoryItems"
            :key="item.id"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-700 last:border-b-0"
          >
            <td class="py-2 pl-4 pr-2 w-[1%]">
              <ResultStatusRing :state="item.status.state?.toLowerCase()" />
            </td>
            <td class="py-3 px-2 whitespace-nowrap grow">
              {{ item.title }}
              <span class="text-sm dark:text-slate-400 ml-12">{{
                formatDateTime(item.end)
              }}</span>
            </td>
            <td class="py-2 px-2 text-right whitespace-nowrap">
              <button
                type="button"
                class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 border-ccf-300 dark:hover:bg-slate-700 dark:border-slate-700"
                @click="openEvidence(item.id)"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="historyItems.length > pageSize"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-gray-500 dark:text-slate-400">
        Showing {{ pageStart }}-{{ pageEnd }} of {{ historyItems.length }}
      </p>

      <div class="flex items-center gap-2">
        <TertiaryButton
          :disabled="currentPage <= 1"
          @click="currentPage = Math.max(1, currentPage - 1)"
        >
          Previous
        </TertiaryButton>
        <span class="text-sm text-gray-600 dark:text-slate-300">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <TertiaryButton
          :disabled="currentPage >= totalPages"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
        >
          Next
        </TertiaryButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { ChartData } from 'chart.js';
import PageCard from '@/components/PageCard.vue';
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue';
import ResultStatusRing from '@/components/ResultStatusRing.vue';
import Message from '@/volt/Message.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts';
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts';
import type { HeartbeatInterval } from '@/stores/heartbeats.ts';
import type { ComplianceInterval, Evidence } from '@/stores/evidence.ts';
import { useDataApi } from '@/composables/axios';

const props = defineProps<{
  uuid: string;
}>();
const router = useRouter();
const pageSize = 10;
const currentPage = ref(1);

const {
  data: evidence,
  isLoading: historyLoading,
  error: historyError,
  execute: loadEvidenceHistory,
} = useDataApi<Evidence[]>(null, null, { immediate: false });

const { data: complianceOverTime, execute: loadComplianceHistory } = useDataApi<
  ComplianceInterval[]
>(
  null,
  {
    params: {
      interval: '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
    },
    method: 'GET',
  },
  { immediate: false },
);

const { data: heartbeats } = useDataApi<HeartbeatInterval[]>(
  '/api/agent/heartbeat/over-time',
  {
    method: 'GET',
  },
);

const historyItems = computed(() => evidence.value ?? []);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(historyItems.value.length / pageSize)),
);
const paginatedHistoryItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return historyItems.value.slice(start, start + pageSize);
});
const pageStart = computed(() => {
  if (historyItems.value.length === 0) {
    return 0;
  }
  return (currentPage.value - 1) * pageSize + 1;
});
const pageEnd = computed(() => {
  if (historyItems.value.length === 0) {
    return 0;
  }
  return Math.min(currentPage.value * pageSize, historyItems.value.length);
});

const complianceChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateComplianceOverTimeData(complianceOverTime.value ?? [], [
    'satisfied',
    'not-satisfied',
  ]);
});

const heartbeatChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateHeartbeatOverTimeData(heartbeats.value ?? []);
});

watch(
  () => props.uuid,
  async (uuid) => {
    currentPage.value = 1;
    await Promise.all([
      loadEvidenceHistory(`/api/evidence/history/${uuid}`),
      loadComplianceHistory(`/api/evidence/status-over-time/${uuid}`),
    ]);
  },
  { immediate: true },
);

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value;
  }
});

function formatDateTime(value?: string) {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString();
}

function openEvidence(id: string) {
  router.push({
    name: 'evidence:view',
    params: { id },
  });
}
</script>
