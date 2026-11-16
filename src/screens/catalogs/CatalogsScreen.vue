<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import {
  catalogType,
  isCatalogActive,
  withCatalogActive,
  type CatalogType,
} from '@/composables/catalog';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { Catalog } from '@/oscal';
import { usePermissionsStore } from '@/stores/permissions';
import { downloadJson } from '@/utils/download-json';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';

/**
 * Catalogs (List template): one tab per catalog type (standards, policies, procedures, internal,
 * other), as on the classic page. The tab, title search and sort live in the URL. Rows can be
 * opened, activated or deactivated, downloaded as full OSCAL JSON, and deleted.
 */
interface Row {
  id: string;
  title: string;
  version: string;
  lastModified: string;
  active: boolean;
  catalog: Catalog;
}

const TYPES: { value: CatalogType; label: string }[] = [
  { value: 'standard', label: 'Standards' },
  { value: 'policy', label: 'Policies' },
  { value: 'procedure', label: 'Procedures' },
  { value: 'internal', label: 'Internal catalogs' },
  { value: 'other', label: 'Other' },
];

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();

// View (URL) ---------------------------------------------------------------------------------

const type = computed<CatalogType>(
  () => TYPES.find((t) => t.value === route.query.type)?.value ?? 'standard',
);
const view = useListView(
  ['title', 'version', 'lastModified'] as const,
  'title',
);
const { q, draft, chips, chipLabels, sort } = view;

// Results ------------------------------------------------------------------------------------

const catalogs = useApiQuery<Catalog[]>('/api/oscal/catalogs');

/** Catalogs matching the search, by type; the tab counts follow the search. */
const matching = computed(() => {
  const groups = Object.fromEntries(
    TYPES.map((t) => [t.value, [] as Catalog[]]),
  ) as Record<CatalogType, Catalog[]>;
  for (const catalog of catalogs.data.value ?? []) {
    if (matches(q.value, catalog.metadata.title))
      groups[catalogType(catalog)].push(catalog);
  }
  return groups;
});

const tabs = computed(() =>
  TYPES.map((t) => ({
    label: t.label,
    to: {
      query: {
        ...route.query,
        type: t.value === 'standard' ? undefined : t.value,
      },
    },
    count:
      catalogs.status.value === 'ready'
        ? matching.value[t.value].length
        : undefined,
  })),
);
const typeLabel = computed(() =>
  TYPES.find((t) => t.value === type.value)!.label.toLowerCase(),
);

const rows = computed<Row[]>(() =>
  view.sortRows(
    matching.value[type.value].map((catalog) => ({
      id: catalog.uuid,
      title: catalog.metadata.title,
      version: catalog.metadata.version ?? '',
      lastModified: catalog.metadata.lastModified ?? '',
      active: isCatalogActive(catalog),
      catalog,
    })),
    'title',
  ),
);

const status = computed(() =>
  catalogs.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : catalogs.status.value,
);

const summary = computed(() => {
  if (!q.value || catalogs.status.value !== 'ready') return '';
  const total = Object.values(matching.value).flat().length;
  return total ? `${plural(total, 'catalog')} match.` : 'No catalogs match.';
});

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true, minWidth: 'sm' },
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
  permissions.can(RESOURCES.CATALOG, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating catalogs.",
);
const updateDenied = computed(() =>
  permissions.can(RESOURCES.CATALOG, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing catalogs.",
);
const deleteDenied = computed(() =>
  permissions.can(RESOURCES.CATALOG, ACTIONS.DELETE)
    ? undefined
    : "Your access doesn't include deleting catalogs.",
);

// Row actions --------------------------------------------------------------------------------

function replace(id: string, next?: Catalog): void {
  const list = catalogs.data.value ?? [];
  catalogs.data.value = next
    ? list.map((c) => (c.uuid === id ? next : c))
    : list.filter((c) => c.uuid !== id);
}

async function setActive(row: Row, active: boolean): Promise<void> {
  try {
    await api.put(`/api/oscal/catalogs/${row.id}/active`, { active });
    replace(row.id, withCatalogActive(row.catalog, active));
    toast.add({
      severity: 'success',
      summary: active ? 'Catalog activated' : 'Catalog deactivated',
      detail: `${row.title} is now ${active ? 'active' : 'inactive'}.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `The catalog wasn't ${active ? 'activated' : 'deactivated'}`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const { data: fullCatalog, execute: fetchFull } = useDataApi<Catalog>(
  null,
  null,
  { immediate: false },
);

async function downloadSource(row: Row): Promise<void> {
  try {
    await fetchFull(`/api/oscal/catalogs/${row.id}/full`);
    downloadJson(
      `${row.title.replace(/[^a-zA-Z0-9]/g, '_')}-catalog.json`,
      fullCatalog.value!,
    );
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Download failed',
      detail: `We couldn't download the source of ${row.title}. Try again.`,
      life: 4000,
    });
  }
}

const toDelete = ref<Row>();
const confirmDelete = computed({
  get: () => Boolean(toDelete.value),
  set: (open: boolean) => {
    if (!open) toDelete.value = undefined;
  },
});

async function remove(): Promise<void> {
  const row = toDelete.value;
  toDelete.value = undefined;
  if (!row) return;
  try {
    await api.delete(`/api/oscal/catalogs/${row.id}`);
    replace(row.id);
    toast.add({
      severity: 'success',
      summary: 'Catalog deleted',
      detail: `${row.title} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The catalog wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function rowActions(row: Row): MenuEntry[] {
  return [
    {
      label: row.active ? 'Deactivate' : 'Activate',
      icon: row.active ? 'paused' : 'check',
      disabledReason: updateDenied.value,
      onSelect: () => void setActive(row, !row.active),
    },
    {
      label: 'Download source (JSON)',
      icon: 'download',
      onSelect: () => void downloadSource(row),
    },
    {
      label: 'Delete catalog',
      icon: 'delete',
      tone: 'danger',
      disabledReason: deleteDenied.value,
      onSelect: () => (toDelete.value = row),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="Catalogs"
    description="OSCAL control catalogs: standards, policies, procedures and your own."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :to="createDenied ? undefined : { name: 'catalog-create' }"
        :disabled-reason="createDenied"
        >New catalog</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter catalogs"
        search-label="Search catalogs"
        search-placeholder="Title"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <Tabs label="Catalog types" :tabs="tabs">
      <DataState
        :status="status"
        :subject="typeLabel"
        :empty-title="`No ${typeLabel} yet`"
        empty-body="Catalogs hold the controls that profiles select from. Import an OSCAL catalog or create your own."
        icon="catalogs"
        :filters="chipLabels"
        @retry="catalogs.retry"
        @clear-filters="view.clearSearch()"
      >
        <DataTable
          v-model:sort="sort"
          :caption="plural(rows.length, 'catalog')"
          caption-hidden
          :columns="columns"
          :rows="rows"
          :row-key="(r) => r.id"
        >
          <template #cell-title="{ row: r }">
            <Cluster gap="2">
              <TextLink :to="{ name: 'catalog-view', params: { id: r.id } }">{{
                r.title
              }}</TextLink>
              <Tag v-if="!r.active" label="Inactive" />
            </Cluster>
          </template>
          <template #cell-version="{ row: r }">{{
            r.version || 'Not set'
          }}</template>
          <template #cell-lastModified="{ row: r }">{{
            r.lastModified ? formatDate(r.lastModified) : 'Not set'
          }}</template>
          <template #actions="{ row: r }">
            <Menu :label="`Actions for ${r.title}`" :items="rowActions(r)" />
          </template>
        </DataTable>
      </DataState>
    </Tabs>
  </ListTemplate>

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.title ?? 'this catalog'}?`"
    confirm-label="Delete catalog"
    @confirm="remove"
    ><Text
      >The catalog and its controls are deleted. This can't be undone.</Text
    ></ConfirmDialog
  >
</template>
