<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { SspTemplate } from '@/types/ssp-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import SspTemplateFormDialog from '@/components/ssp-templates/SspTemplateFormDialog.vue';
import { formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';

/**
 * System templates (List template, admin): rules that create one system security plan per
 * application, or other label combination, found in the evidence. The create and edit form is
 * still the classic dialog (a legacy island).
 */
const toast = useToast();
const api = useAuthenticatedInstance();
const view = useListView(['name', 'systems', 'lastRun'] as const, 'name');
const { q, draft, chips, chipLabels, sort } = view;

const templates = useApiQuery<SspTemplate[]>('/api/admin/ssp-templates');

const rows = computed(() =>
  view.sortRows(
    (templates.data.value ?? [])
      .filter((t) => matches(q.value, t.name, ...t.keys))
      .map((t) => ({
        id: t.id,
        name: t.name,
        keys: t.keys,
        enabled: t.enabled,
        // Zero-padded so the natural sort orders counts numerically.
        systems: String(t.sspCount ?? 0).padStart(6, '0'),
        sspCount: t.sspCount,
        lastRun: t.lastRunAt ?? '',
        template: t,
      })),
    'name',
  ),
);
type Row = (typeof rows.value)[number];

const status = computed(() =>
  templates.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : templates.status.value,
);
const summary = computed(() => {
  if (!q.value || templates.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'template')} match.`
    : 'No templates match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'keys', label: 'Keys' },
  {
    key: 'systems',
    label: 'Systems created',
    sortable: true,
    align: 'end',
    initialDirection: 'descending',
  },
  {
    key: 'lastRun',
    label: 'Last run',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];

// Create, edit, delete -------------------------------------------------------------------------

const formOpen = ref(false);
const editing = ref<SspTemplate | null>(null);
function openForm(template: SspTemplate | null): void {
  editing.value = template;
  formOpen.value = true;
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
    await api.delete(`/api/admin/ssp-templates/${row.id}`);
    templates.data.value = (templates.data.value ?? []).filter(
      (t) => t.id !== row.id,
    );
    toast.add({
      severity: 'success',
      summary: 'Template deleted',
      detail: `${row.name} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The template wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function rowActions(row: Row): MenuEntry[] {
  return [
    { label: 'Edit', icon: 'edit', onSelect: () => openForm(row.template) },
    {
      label: 'Delete template',
      icon: 'delete',
      tone: 'danger',
      onSelect: () => (toDelete.value = row),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="System Templates"
    description="Create one system per application, or any label combination, found in the evidence."
  >
    <template #actions>
      <Button variant="primary" icon="add" @click="openForm(null)"
        >New template</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter system templates"
        search-label="Search templates"
        search-placeholder="Name or key"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="system templates"
      empty-title="No system templates yet"
      empty-body="A system template watches incoming evidence and creates a system for each distinct value of its keys, such as one per application label."
      icon="templates"
      :filters="chipLabels"
      @retry="templates.retry"
      @clear-filters="view.clearSearch()"
    >
      <template #empty-actions>
        <Button variant="primary" icon="add" @click="openForm(null)"
          >New template</Button
        >
      </template>
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'system template')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Cluster gap="2">
            <TextLink
              :to="{ name: 'admin-ssp-template-detail', params: { id: r.id } }"
              >{{ r.name }}</TextLink
            >
            <Tag v-if="!r.enabled" label="Disabled" />
          </Cluster>
        </template>
        <template #cell-keys="{ row: r }">
          <Cluster gap="1">
            <Tag v-for="key in r.keys" :key="key" :label="key" />
          </Cluster>
        </template>
        <template #cell-systems="{ row: r }">{{
          r.sspCount ?? 'Not known'
        }}</template>
        <template #cell-lastRun="{ row: r }">{{
          r.lastRun ? formatDateTime(r.lastRun) : 'Never'
        }}</template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="rowActions(r)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <SspTemplateFormDialog
    v-model:visible="formOpen"
    :template="editing"
    @saved="templates.retry"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.name ?? 'this template'}?`"
    confirm-label="Delete template"
    @confirm="remove"
    ><Text
      >The systems it created, and their scope entries, are kept.</Text
    ></ConfirmDialog
  >
</template>
