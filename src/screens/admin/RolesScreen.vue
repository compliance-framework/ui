<script setup lang="ts">
import { computed } from 'vue';
import type { Role } from '@/oscal';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';

/** Roles (List template): the OSCAL roles documents assign parties to. Read only. */
const view = useListView(['title', 'id'] as const, 'title');
const { q, draft, chips, chipLabels, sort } = view;

const roles = useApiQuery<Role[]>('/api/oscal/roles');

const rows = computed(() =>
  view.sortRows(
    (roles.data.value ?? [])
      .filter((r) =>
        matches(q.value, r.title, r.id, r.shortName, r.description),
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        shortName: r.shortName ?? '',
        description: r.description ?? '',
      })),
    'title',
  ),
);

const status = computed(() =>
  roles.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : roles.status.value,
);
const summary = computed(() => {
  if (!q.value || roles.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'role')} match.`
    : 'No roles match.';
});

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true, minWidth: 'sm' },
  { key: 'id', label: 'ID', sortable: true, nowrap: true },
  { key: 'description', label: 'Description', minWidth: 'md' },
];
</script>

<template>
  <ListTemplate
    title="Roles"
    description="Responsibilities that documents assign to parties, such as system owner."
  >
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter roles"
        search-label="Search roles"
        search-placeholder="Title, ID or description"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="roles"
      empty-title="No roles yet"
      empty-body="Roles are added when documents that define them are created or imported."
      icon="people"
      :filters="chipLabels"
      @retry="roles.retry"
      @clear-filters="view.clearSearch()"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'role')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }"
          >{{ r.title
          }}<template v-if="r.shortName">
            ({{ r.shortName }})</template
          ></template
        >
        <template #cell-description="{ row: r }">{{
          r.description || 'None'
        }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>
</template>
