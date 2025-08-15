<template>
  <PageHeader>Evidence</PageHeader>
  <PageSubHeader>Search for evidence using labels</PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Compliance over time
        <InfoCircleIcon
          class="inline-block ml-1"
          v-tooltip.top="
            'This shows the compliance of findings over time from Observations sent back from the agents, grouped by whether each control is classed as \'Satisfied\' or \'Unsatisfied\'.'
          "
        />
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Agent health
        <InfoCircleIcon
          class="inline-block ml-1"
          v-tooltip.top="
            'This shows the amount of agents over time that are responding to heartbeats sent to them by the central API server'
          "
        />
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </PageCard>
  </div>

  <div class="mt-4">
    <div class="flex gap-4">
      <form @submit.prevent="search" class="grow">
        <div
          class="flex border rounded-md text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-ccf-300 dark:border-slate-700"
        >
          <div class="pl-4 my-auto">
            <BIconSearch
              class="mr-2"
              height="1.2rem"
              width="1.2rem"
            ></BIconSearch>
          </div>
          <input
            type="text"
            v-model="filter"
            id="filter"
            name="filter"
            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"
            class="grow px-2 py-2 focus:border-none focus-visible:border-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none bg-white dark:bg-slate-900"
          />
          <SecondaryButton type="submit" class="border-none text-sm">
            Search
          </SecondaryButton>
        </div>
      </form>
      <PrimaryButton @click.prevent="save" class="text-sm">
        Save
      </PrimaryButton>
      <div class="card flex justify-center">
        <BurgerMenu :items="menuItems" />
      </div>
    </div>
  </div>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <EvidenceList :evidence="evidence" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { FilterParser } from '@/parsers/labelfilter.ts';
import { BIconSearch } from 'bootstrap-icons-vue';
import type { ChartData } from 'chart.js';
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts';
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue';
import type  { HeartbeatInterval } from '@/stores/heartbeats.ts';
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts';
import { useConfigStore } from '@/stores/config.ts';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import InfoCircleIcon from '@primevue/icons/infocircle';
import type { ComplianceInterval, Evidence, } from '@/stores/evidence.ts';
import EvidenceList from '@/components/EvidenceList.vue';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useDataApi } from '@/composables/axios';

const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();

const filter = ref<string>('');
if (route.query.filter) {
  filter.value = route.query.filter as string;
}

const { data: evidenceData, execute: loadEvidence } = useDataApi<Evidence[]>('/api/evidence/search',
  {
    method: 'POST',
  }, { immediate: false }
);

const evidence = computed(() => {
  return evidenceData.value
    ? [...evidenceData.value].sort((a, b) => {
        // Order results by their end date for better UI consistency
        const x = new Date(a.end);
        const y = new Date(b.end);

        if (x > y) {
          return 1;
        }
        if (x < y) {
          return -1;
        }
        return 0;
      })
    : [];
});

const { data: complianceOverTime, execute: loadComplianceOverTime } = useDataApi<ComplianceInterval[]>('/api/evidence/status-over-time',
  {
    params: {
      interval: '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
    },
    method: 'POST',
  }, { immediate: false }
);
const complianceChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateComplianceOverTimeData(
    complianceOverTime.value ?? [],
    ['satisfied', 'not-satisfied'],
  );
});

const { data: heartbeats, execute: loadHeartbeats } = useDataApi<HeartbeatInterval[]>('/api/agent/heartbeat/over-time',
  {
    method: 'GET',
  }, { immediate: false }
);
const heartbeatChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateHeartbeatOverTimeData(heartbeats.value ?? []);
});

async function search() {
  const query = new FilterParser(filter.value).parse();

  await loadEvidence({
    data: {filter: query}
  });

  await loadComplianceOverTime({
    data: { filter: query },
  });
  await loadHeartbeats();
}

async function save() {
  await router.push({
    name: 'dashboards.create',
    query: { filter: filter.value },
  });
}

const menuItems = ref([
  {
    label: 'Labels',
    items: [
      {
        label: configStore.showLabels ? 'Hide' : 'Show',
        icon: 'pi pi-upload',
        command: () => {
          configStore.toggleLabels();
        },
      },
      {
        label: configStore.showHiddenLabels ? 'Hide Hidden' : 'Show Hidden',
        icon: 'pi pi-upload',
        command: () => {
          configStore.toggleHiddenLabels();
        },
      },
    ],
  },
  {
    label: 'Evidence',
    items: [
      {
        label: 'Create New',
        icon: 'pi pi-plus',
        command: async () => {
          await router.push({
            name: 'evidence:create',
          });
        },
      },
    ],
  },
]);

onMounted(() => {
  search();
});
</script>
