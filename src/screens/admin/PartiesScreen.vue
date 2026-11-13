<script setup lang="ts">
import { computed } from 'vue';
import type { Party } from '@/oscal';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';

/** Parties (List template): the people and organisations OSCAL documents refer to. Read only. */
const view = useListView(['name', 'type'] as const, 'name');
const { q, draft, chips, chipLabels, sort } = view;

const parties = useApiQuery<Party[]>('/api/oscal/parties');

const rows = computed(() =>
  view.sortRows(
    (parties.data.value ?? [])
      .filter((p) => matches(q.value, p.name, p.shortName, p.remarks))
      .map((p) => ({
        id: p.uuid,
        name: p.name || p.shortName || 'Unnamed',
        shortName: p.name ? (p.shortName ?? '') : '',
        type: p.type,
        email: p.emailAddresses?.join(', ') ?? '',
        remarks: p.remarks ?? '',
      })),
    'name',
  ),
);

const status = computed(() =>
  parties.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : parties.status.value,
);
const summary = computed(() => {
  if (!q.value || parties.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'party', 'parties')} match.`
    : 'No parties match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'type', label: 'Type', sortable: true, nowrap: true },
  { key: 'email', label: 'Email' },
  { key: 'remarks', label: 'Remarks', minWidth: 'md' },
];
</script>

<template>
  <ListTemplate
    title="Parties"
    description="People and organisations that documents name as responsible."
  >
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter parties"
        search-label="Search parties"
        search-placeholder="Name or remarks"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="parties"
      empty-title="No parties yet"
      empty-body="Parties are added when documents that name them are created or imported."
      icon="people"
      :filters="chipLabels"
      @retry="parties.retry"
      @clear-filters="view.clearSearch()"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'party', 'parties')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }"
          >{{ r.name
          }}<template v-if="r.shortName">
            ({{ r.shortName }})</template
          ></template
        >
        <template #cell-type="{ row: r }"><Tag :label="r.type" /></template>
        <template #cell-email="{ row: r }">{{ r.email || 'None' }}</template>
        <template #cell-remarks="{ row: r }">{{
          r.remarks || 'None'
        }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>
</template>
