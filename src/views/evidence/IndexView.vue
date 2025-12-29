<template>
  <PageHeader>Evidence</PageHeader>
  <PageSubHeader>Search for evidence using labels</PageSubHeader>
  <Message v-if="error" severity="error" class="mt-4">
    {{ error.message }}
  </Message>
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
      <SecondaryButton @click.prevent="share" class="text-sm">
        <BIconShare class="mr-2" />
        Share
      </SecondaryButton>
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
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AxiosError } from 'axios';
import { useUIStore } from '@/stores/ui.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';
import { FilterParser } from '@/parsers/labelfilter.ts';
import { BIconSearch, BIconShare } from 'bootstrap-icons-vue';
import type { ChartData } from 'chart.js';
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts';
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue';
import type { HeartbeatInterval } from '@/stores/heartbeats.ts';
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InfoCircleIcon from '@primevue/icons/infocircle';
import type { ComplianceInterval, Evidence } from '@/stores/evidence.ts';
import EvidenceList from '@/components/EvidenceList.vue';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useDataApi } from '@/composables/axios';

const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const toast = useToast();
const error = ref<AxiosError | null>(null);

const filter = computed({
  get: () => uiStore.evidenceFilter,
  set: (val) => {
    // Avoid updating if the value is already the same to prevent redundant cycles
    if (val === uiStore.evidenceFilter) {
      return;
    }
    uiStore.setEvidenceFilter(val);
    // Update URL query parameter without reloading page
    router.replace({
      query: { ...route.query, filter: val || undefined },
    });
  },
});

watch(
  () => route.query.filter,
  (newFilter) => {
    // Avoid redundant updates when the change originated from the filter setter
    if (newFilter === uiStore.evidenceFilter) {
      return;
    }

    if (typeof newFilter === 'string') {
      uiStore.setEvidenceFilter(newFilter);
    } else {
      uiStore.setEvidenceFilter('');
    }
    search();
  },
);

const { data: evidenceData, execute: loadEvidence } = useDataApi<Evidence[]>(
  '/api/evidence/search',
  {
    method: 'POST',
  },
  { immediate: false },
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

const { data: complianceOverTime, execute: loadComplianceOverTime } =
  useDataApi<ComplianceInterval[]>(
    '/api/evidence/status-over-time',
    {
      params: {
        interval: '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h',
      },
      method: 'POST',
    },
    { immediate: false },
  );
const complianceChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateComplianceOverTimeData(complianceOverTime.value ?? [], [
    'satisfied',
    'not-satisfied',
  ]);
});

const { data: heartbeats, execute: loadHeartbeats } = useDataApi<
  HeartbeatInterval[]
>(
  '/api/agent/heartbeat/over-time',
  {
    method: 'GET',
  },
  { immediate: false },
);
const heartbeatChartData = computed<ChartData<'line', DateDataPoint[]>>(() => {
  return calculateHeartbeatOverTimeData(heartbeats.value ?? []);
});

async function search() {
  const query = new FilterParser(filter.value).parse();

  try {
    await Promise.all([
      loadEvidence({
        data: { filter: query },
      }),
      loadComplianceOverTime({
        data: { filter: query },
      }),
      loadHeartbeats(),
    ]);
  } catch (err) {
    error.value = err as AxiosError;
  }
}

onMounted(() => {
  if (route.query.filter) {
    uiStore.setEvidenceFilter(route.query.filter as string);
  }
  search();
});

async function save() {
  await router.push({
    name: 'dashboards.create',
    query: { filter: filter.value },
  });
}

function share() {
  const url = new URL(window.location.href);
  if (filter.value) {
    url.searchParams.set('filter', filter.value);
  } else {
    url.searchParams.delete('filter');
  }

  navigator.clipboard.writeText(url.toString()).then(() => {
    toast.add({
      severity: 'success',
      summary: 'Link Copied',
      detail:
        'The link to this evidence search has been copied to your clipboard.',
      life: 3000,
    });
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
</script>
