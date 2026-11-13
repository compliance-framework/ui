<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { SystemSecurityPlan } from '@/oscal';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import { downloadJson } from '@/utils/download-json';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type {
  DataTableColumn,
  DataTableSort,
} from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import {
  readView,
  sortLabel,
  sortRows,
  viewQuery,
  type SortKey,
  type SystemsView,
} from './systemsView';

/**
 * Systems (List template), the first redesigned screen on live data: one row per system security
 * plan. Search and sort live in the URL, so Back and Share reproduce the view. Creating and editing
 * a system are not rebuilt yet, so those links open the existing pages.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const permissions = usePermissionsStore();
const systemStore = useSystemStore();

const view = computed(() => readView(route.query));

/** The current query with the view replaced, keeping anything else in it. */
function withView(next: SystemsView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of ['q', 'sort', 'dir']) delete query[key];
  return { ...query, ...viewQuery(next) };
}

/** Each change is a history entry, so Back undoes it. */
function go(patch: Partial<SystemsView>): void {
  void router.push({ query: withView({ ...view.value, ...patch }) });
}

// Search -------------------------------------------------------------------------------------

const draft = ref(view.value.q);
watch(
  () => view.value.q,
  (q) => (draft.value = q),
);

const chips = computed(() =>
  view.value.q ? [{ label: `Search: ${view.value.q}`, remove: { q: '' } }] : [],
);
const chipLabels = computed(() => chips.value.map((chip) => chip.label));

function clearFilters(): void {
  go({ q: '' });
}

// Results ------------------------------------------------------------------------------------

const plans = useApiQuery<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const rows = computed(() => {
  const needle = view.value.q.toLowerCase();
  const matching = (plans.data.value ?? [])
    .map((plan) => ({
      id: plan.uuid,
      name: plan.metadata.title,
      version: plan.metadata.version ?? '',
      lastModified: plan.metadata.lastModified ?? '',
      plan,
    }))
    .filter((row) => !needle || row.name.toLowerCase().includes(needle));
  return sortRows(matching, view.value.sort, view.value.dir);
});

/** A successful empty list is first use; empty under a search is filtered-empty. */
const status = computed(() =>
  plans.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : plans.status.value,
);

const caption = computed(
  () =>
    `${plural(rows.value.length, 'system')}, sorted by ${sortLabel(view.value.sort, view.value.dir)}`,
);
/** The count shows only while the list is narrowed. */
const summary = computed(() => {
  if (!chips.value.length) return '';
  if (status.value === 'empty') return 'No systems match.';
  return status.value === 'ready'
    ? `${plural(rows.value.length, 'system')} match.`
    : '';
});

const sort = computed<DataTableSort>({
  get: () => ({ key: view.value.sort, direction: view.value.dir }),
  set: (next) => go({ sort: next.key as SortKey, dir: next.direction }),
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'version', label: 'Version', sortable: true, nowrap: true },
  {
    key: 'lastModified',
    label: 'Last modified',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];

const createDenied = computed(() =>
  permissions.can(RESOURCES.SSP, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating systems.",
);

// Row actions --------------------------------------------------------------------------------

const { data: fullPlan, execute: fetchFullPlan } =
  useDataApi<SystemSecurityPlan>(null, null, { immediate: false });

async function downloadSource(plan: SystemSecurityPlan): Promise<void> {
  const title = plan.metadata.title;
  try {
    await fetchFullPlan(`/api/oscal/system-security-plans/${plan.uuid}/full`);
    downloadJson(
      `${title.replace(/[^a-zA-Z0-9]/g, '_')}-ssp.json`,
      fullPlan.value!,
    );
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Download failed',
      detail: `We couldn't download the source of ${title}. Try again.`,
      life: 4000,
    });
  }
}

function rowActions(plan: SystemSecurityPlan): MenuEntry[] {
  const current = systemStore.system.securityPlan?.uuid === plan.uuid;
  return [
    {
      label: 'Make current system',
      icon: 'check',
      disabledReason: current
        ? 'This is already the current system.'
        : undefined,
      onSelect: () => systemStore.setSecurityPlan(plan),
    },
    {
      label: 'Download source (JSON)',
      icon: 'download',
      onSelect: () => void downloadSource(plan),
    },
  ];
}
</script>

<template>
  <ListTemplate title="Systems">
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :to="
          createDenied ? undefined : { name: 'system-security-plans-create' }
        "
        :disabled-reason="createDenied"
        >New system</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter systems"
        search-label="Search systems"
        search-placeholder="Name, e.g. Payments platform"
        :chips="chips"
        :summary="summary"
        @search="go({ q: draft.trim() })"
        @remove="(index) => go(chips[index]!.remove)"
        @clear="clearFilters"
      />
    </template>

    <DataState
      :status="status"
      subject="systems"
      empty-title="No systems yet"
      empty-body="A system is a service you track compliance for, such as a product or a platform. Each has its own security plan: the controls it must meet, its components and people, the evidence that its controls work, and its risks."
      icon="systems"
      :filters="chipLabels"
      @retry="plans.retry"
      @clear-filters="clearFilters"
    >
      <template #empty-actions>
        <Button
          variant="primary"
          icon="add"
          :to="
            createDenied ? undefined : { name: 'system-security-plans-create' }
          "
          :disabled-reason="createDenied"
          >New system</Button
        >
      </template>

      <DataTable
        v-model:sort="sort"
        :caption="caption"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Cluster gap="2">
            <TextLink
              :to="{
                name: 'system-security-plan-editor',
                params: { id: r.id },
              }"
              >{{ r.name }}</TextLink
            >
            <Tag
              v-if="systemStore.system.securityPlan?.uuid === r.id"
              label="Current"
            />
          </Cluster>
        </template>
        <template #cell-version="{ row: r }">{{
          r.version || 'Not set'
        }}</template>
        <template #cell-lastModified="{ row: r }">{{
          r.lastModified ? formatDate(r.lastModified) : 'Not set'
        }}</template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="rowActions(r.plan)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>
</template>
