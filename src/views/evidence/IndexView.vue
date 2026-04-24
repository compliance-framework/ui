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
      <form @submit.prevent="submitSearch" class="grow">
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
      <SecondaryButton
        :disabled="totalEvidence === 0 || exportingCsv"
        @click.prevent="exportToCsv"
        class="text-sm"
      >
        <BIconDownload class="mr-2" />
        {{ exportingCsv ? 'Exporting...' : 'Export to CSV' }}
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
    <EvidenceList
      :evidence="evidence"
      :navigation-query="navigationQuery"
      :sort-by="sortBy"
      :sort-direction="sortDirection"
      @sort="changeSort"
    />
  </div>

  <div
    v-if="totalEvidence > 0"
    class="mt-4 flex flex-wrap items-center justify-between gap-3"
  >
    <p class="text-sm text-gray-500 dark:text-slate-400">
      Showing {{ pageStart }}-{{ pageEnd }} of {{ totalEvidence }}
    </p>

    <div class="flex items-center gap-2">
      <TertiaryButton
        :disabled="currentPage <= 1"
        @click="changePage(currentPage - 1)"
      >
        Previous
      </TertiaryButton>
      <span class="text-sm text-gray-600 dark:text-slate-300">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <TertiaryButton
        :disabled="currentPage >= totalPages"
        @click="changePage(currentPage + 1)"
      >
        Next
      </TertiaryButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AxiosError } from 'axios';
import { useUIStore } from '@/stores/ui.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';
import { FilterParser } from '@/parsers/labelfilter.ts';
import { BIconDownload, BIconSearch, BIconShare } from 'bootstrap-icons-vue';
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
import TertiaryButton from '@/volt/TertiaryButton.vue';
import InfoCircleIcon from '@primevue/icons/infocircle';
import type {
  ComplianceInterval,
  Evidence,
  EvidenceSortBy,
  SortDirection,
} from '@/stores/evidence.ts';
import EvidenceList from '@/components/EvidenceList.vue';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import type { PaginatedListResponse } from '@/stores/types.ts';

const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const toast = useToast();
const authenticatedApi = useAuthenticatedInstance();
const error = ref<AxiosError | null>(null);
const evidence = ref<Evidence[]>([]);
const totalEvidence = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const sortBy = ref<EvidenceSortBy>('lastSeenAt');
const sortDirection = ref<SortDirection>('desc');
const exportingCsv = ref(false);
const lastExecutedFilter = ref('');
const lastExecutedSortBy = ref<EvidenceSortBy>('lastSeenAt');
const lastExecutedSortDirection = ref<SortDirection>('desc');

const EVIDENCE_PAGE_SIZE = 50;
const EVIDENCE_EXPORT_PAGE_SIZE = 100;
const EVIDENCE_EXPORT_CONFIRM_THRESHOLD = 1000;
const SEARCH_DEBOUNCE_MS = 500;
const EVIDENCE_STATUS_INTERVAL =
  '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h';
const CSV_EXCLUDED_HEADERS = new Set([
  'id',
  'uuid',
  'labels',
  'origins',
  'backMatter',
]);
let filterRouteUpdateTimeout: ReturnType<typeof setTimeout> | undefined;

const filter = computed({
  get: () => uiStore.evidenceFilter,
  set: (val) => {
    // Avoid updating if the value is already the same to prevent redundant cycles
    if (val === uiStore.evidenceFilter) {
      return;
    }
    uiStore.setEvidenceFilter(val);
    scheduleFilterRouteUpdate(val);
  },
});

watch(
  [
    () => route.query.filter,
    () => route.query.page,
    () => route.query.sortBy,
    () => route.query.sortDirection,
  ],
  (
    [newFilter, newPage, newSortBy, newSortDirection],
    [oldFilter, oldPage, oldSortBy, oldSortDirection],
  ) => {
    const nextFilter = getRouteFilterValue(newFilter);

    uiStore.setEvidenceFilter(nextFilter);

    currentPage.value = parsePageQuery(newPage);
    sortBy.value = parseSortByQuery(newSortBy);
    sortDirection.value = parseSortDirectionQuery(newSortDirection);

    if (
      newFilter === oldFilter &&
      newPage === oldPage &&
      newSortBy === oldSortBy &&
      newSortDirection === oldSortDirection
    ) {
      return;
    }

    if (typeof newFilter === 'string' && nextFilter.length === 0) {
      void replaceFilterRoute('');
      return;
    }

    search(currentPage.value);
  },
);

const { data: complianceOverTime, execute: loadComplianceOverTime } =
  useDataApi<ComplianceInterval[]>(
    '/api/evidence/status-over-time',
    {
      params: {
        interval: EVIDENCE_STATUS_INTERVAL,
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

const pageStart = computed(() => {
  if (totalEvidence.value === 0) {
    return 0;
  }

  return (currentPage.value - 1) * EVIDENCE_PAGE_SIZE + 1;
});

const pageEnd = computed(() => {
  if (totalEvidence.value === 0) {
    return 0;
  }

  return Math.min(currentPage.value * EVIDENCE_PAGE_SIZE, totalEvidence.value);
});

function parsePageQuery(value: unknown) {
  const page = Number.parseInt(String(value ?? ''), 10);

  if (Number.isNaN(page) || page < 1) {
    return 1;
  }

  return page;
}

function parseSortByQuery(value: unknown): EvidenceSortBy {
  if (value === 'name' || value === 'status' || value === 'lastSeenAt') {
    return value;
  }

  return 'lastSeenAt';
}

function parseSortDirectionQuery(value: unknown): SortDirection {
  if (value === 'asc' || value === 'desc') {
    return value;
  }

  return 'desc';
}

function isLabelFilterSearch(value: string) {
  return /!?=/.test(value);
}

function hasIncompleteLabelSyntax(value: string) {
  return /!?=\s*$/.test(value.trim());
}

function canRunEvidenceSearch(value: string) {
  const searchText = value.trim();

  if (searchText.length === 0) {
    return true;
  }

  return searchText.length >= 3 && !hasIncompleteLabelSyntax(searchText);
}

function getRouteFilterValue(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return canRunEvidenceSearch(value) ? value.trim() : '';
}

function canPersistFilterInRoute(value: string) {
  return value.length === 0 || canRunEvidenceSearch(value);
}

function normalizeFilterRouteValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function scheduleFilterRouteUpdate(value: string) {
  clearFilterRouteUpdateTimeout();

  if (!canPersistFilterInRoute(value)) {
    return;
  }

  filterRouteUpdateTimeout = setTimeout(() => {
    filterRouteUpdateTimeout = undefined;
    void replaceFilterRoute(value);
  }, SEARCH_DEBOUNCE_MS);
}

function clearFilterRouteUpdateTimeout() {
  if (filterRouteUpdateTimeout) {
    clearTimeout(filterRouteUpdateTimeout);
    filterRouteUpdateTimeout = undefined;
  }
}

async function replaceFilterRoute(value: string) {
  await router.replace({
    query: {
      ...route.query,
      filter: normalizeFilterRouteValue(value),
      page: undefined,
    },
  });
}

async function flushFilterRouteUpdate() {
  clearFilterRouteUpdateTimeout();

  if (!canPersistFilterInRoute(uiStore.evidenceFilter)) {
    return false;
  }

  const nextFilter = normalizeFilterRouteValue(uiStore.evidenceFilter);
  const currentFilter =
    typeof route.query.filter === 'string' ? route.query.filter : undefined;

  if (currentFilter === nextFilter && route.query.page === undefined) {
    return false;
  }

  await replaceFilterRoute(uiStore.evidenceFilter);
  return true;
}

function buildEvidenceSearchRequest(
  page: number,
  options?: {
    filterText?: string;
    limit?: number;
    sortBy?: EvidenceSortBy;
    sortDirection?: SortDirection;
  },
) {
  const searchText = (options?.filterText ?? uiStore.evidenceFilter).trim();
  const isLabelSearch = isLabelFilterSearch(searchText);
  const query = isLabelSearch
    ? new FilterParser(searchText).parse()
    : new FilterParser('').parse();

  const params = new URLSearchParams({
    page: String(page),
    limit: String(options?.limit ?? EVIDENCE_PAGE_SIZE),
    sortBy: options?.sortBy ?? sortBy.value,
    sortDirection: options?.sortDirection ?? sortDirection.value,
  });

  if (searchText && !isLabelSearch) {
    params.set('name', searchText);
  }

  const complianceParams: Record<string, string> = {
    interval: EVIDENCE_STATUS_INTERVAL,
  };

  if (searchText && !isLabelSearch) {
    complianceParams.name = searchText;
  }

  return {
    url: `/api/evidence/search?${params.toString()}`,
    body: {
      filter: query,
    },
    complianceParams,
    searchText,
    sortBy: options?.sortBy ?? sortBy.value,
    sortDirection: options?.sortDirection ?? sortDirection.value,
  };
}

const navigationQuery = computed<Record<string, string | undefined>>(() => {
  const nextFilter = canPersistFilterInRoute(uiStore.evidenceFilter)
    ? normalizeFilterRouteValue(uiStore.evidenceFilter)
    : undefined;

  return {
    filter: nextFilter,
    sortBy: sortBy.value === 'lastSeenAt' ? undefined : sortBy.value,
    sortDirection:
      sortDirection.value === 'desc' ? undefined : sortDirection.value,
    page: currentPage.value > 1 ? String(currentPage.value) : undefined,
  };
});

async function search(page = currentPage.value) {
  error.value = null;

  if (!canRunEvidenceSearch(uiStore.evidenceFilter)) {
    return;
  }

  try {
    const request = buildEvidenceSearchRequest(page);
    const [evidenceResponse] = await Promise.all([
      authenticatedApi.post<PaginatedListResponse<Evidence>>(
        request.url,
        request.body,
      ),
      loadComplianceOverTime({
        data: request.body,
        params: request.complianceParams,
      }),
      loadHeartbeats(),
    ]);

    const paginatedEvidence = evidenceResponse.data;

    evidence.value = paginatedEvidence.data ?? [];
    totalEvidence.value = paginatedEvidence.total ?? 0;
    currentPage.value = paginatedEvidence.page ?? page;
    totalPages.value = Math.max(paginatedEvidence.totalPages ?? 1, 1);
    lastExecutedFilter.value = request.searchText;
    lastExecutedSortBy.value = request.sortBy;
    lastExecutedSortDirection.value = request.sortDirection;
  } catch (err) {
    error.value = err as AxiosError;
  }
}

function sanitizeCsvCell(value: string) {
  if (value.match(/^\s*[=+\-@]/)) {
    return "'" + value;
  }

  return value;
}

function flattenCsvRecord(
  value: unknown,
  prefix = '',
  output: Record<string, string> = {},
) {
  if (value === null || value === undefined) {
    if (prefix) {
      output[prefix] = '';
    }

    return output;
  }

  if (Array.isArray(value)) {
    if (prefix) {
      output[prefix] = JSON.stringify(value);
    }

    return output;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      if (prefix) {
        output[prefix] = '{}';
      }

      return output;
    }

    for (const [key, nestedValue] of entries) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenCsvRecord(nestedValue, nextPrefix, output);
    }

    return output;
  }

  if (prefix) {
    output[prefix] = String(value);
  }

  return output;
}

function buildEvidenceCsv(evidenceItems: Evidence[]) {
  const payloadHeaders = new Set<string>();
  const labelHeaders = new Set<string>();
  const rows = evidenceItems.map((item) => {
    const row = flattenCsvRecord(item);
    row.labels = JSON.stringify(item.labels ?? []);

    for (const header of Object.keys(row)) {
      if (
        !header.startsWith('label.') &&
        !Array.from(CSV_EXCLUDED_HEADERS).some(
          (excludedHeader) =>
            header === excludedHeader ||
            header.startsWith(`${excludedHeader}.`),
        )
      ) {
        payloadHeaders.add(header);
      }
    }

    for (const label of item.labels ?? []) {
      const labelHeader = `label.${label.name}`;
      row[labelHeader] = label.value;
      labelHeaders.add(labelHeader);
    }

    return row;
  });

  const headers = [
    ...Array.from(payloadHeaders).sort(),
    ...Array.from(labelHeaders).sort(),
  ];

  return [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ]
    .map((row) =>
      row
        .map((cell) => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}

function downloadCsv(csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evidence-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportToCsv() {
  if (totalEvidence.value === 0 || exportingCsv.value) {
    return;
  }

  if (
    totalEvidence.value > EVIDENCE_EXPORT_CONFIRM_THRESHOLD &&
    !window.confirm(
      `Export ${totalEvidence.value} evidence records to CSV? This may take a while.`,
    )
  ) {
    return;
  }

  exportingCsv.value = true;

  try {
    const allEvidence: Evidence[] = [];
    let page = 1;
    let totalExportPages = 1;

    do {
      const request = buildEvidenceSearchRequest(page, {
        filterText: lastExecutedFilter.value,
        limit: EVIDENCE_EXPORT_PAGE_SIZE,
        sortBy: lastExecutedSortBy.value,
        sortDirection: lastExecutedSortDirection.value,
      });
      const response = await authenticatedApi.post<
        PaginatedListResponse<Evidence>
      >(request.url, request.body);
      const paginatedEvidence = response.data;

      allEvidence.push(...(paginatedEvidence.data ?? []));
      totalExportPages = Math.max(paginatedEvidence.totalPages ?? 1, 1);
      page += 1;
    } while (page <= totalExportPages);

    const csvContent = buildEvidenceCsv(allEvidence);

    downloadCsv(csvContent);
    toast.add({
      severity: 'success',
      summary: 'CSV Exported',
      detail: `Downloaded ${allEvidence.length} evidence records.`,
      life: 3000,
    });
  } catch (err) {
    console.error('Failed to export evidence CSV:', err);
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'Unable to export evidence as CSV. Please try again.',
      life: 4000,
    });
  } finally {
    exportingCsv.value = false;
  }
}

function getDefaultSortDirection(nextSortBy: EvidenceSortBy): SortDirection {
  if (nextSortBy === 'name' || nextSortBy === 'status') {
    return 'asc';
  }

  return 'desc';
}

async function changeSort(nextSortBy: EvidenceSortBy) {
  const nextSortDirection =
    sortBy.value === nextSortBy
      ? sortDirection.value === 'asc'
        ? 'desc'
        : 'asc'
      : getDefaultSortDirection(nextSortBy);

  await router.replace({
    query: {
      ...route.query,
      sortBy: nextSortBy,
      sortDirection: nextSortDirection,
      page: undefined,
    },
  });
}

async function changePage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value);

  if (nextPage === currentPage.value) {
    return;
  }

  await router.replace({
    query: {
      ...route.query,
      page: nextPage > 1 ? String(nextPage) : undefined,
    },
  });
}

async function submitSearch() {
  const routeUpdated = await flushFilterRouteUpdate();

  if (routeUpdated) {
    return;
  }

  await search(1);
}

onMounted(() => {
  const nextFilter = getRouteFilterValue(route.query.filter);

  uiStore.setEvidenceFilter(nextFilter);
  currentPage.value = parsePageQuery(route.query.page);
  sortBy.value = parseSortByQuery(route.query.sortBy);
  sortDirection.value = parseSortDirectionQuery(route.query.sortDirection);

  if (typeof route.query.filter === 'string' && nextFilter.length === 0) {
    void replaceFilterRoute('');
    return;
  }

  search(currentPage.value);
});

onBeforeUnmount(() => {
  clearFilterRouteUpdateTimeout();
});

async function save() {
  await router.push({
    name: 'dashboards.create',
    query: { filter: filter.value },
  });
}

function share() {
  const url = window.location.href;

  navigator.clipboard
    .writeText(url)
    .then(() => {
      toast.add({
        severity: 'success',
        summary: 'Link Copied',
        detail:
          'The link to this evidence search has been copied to your clipboard.',
        life: 3000,
      });
    })
    .catch((err) => {
      console.error('Failed to copy to clipboard:', err);
      toast.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Unable to copy the link to your clipboard. Please try again.',
        life: 4000,
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
