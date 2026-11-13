<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { CCFGroup } from '@/stores/types';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import NewGroupDialog from './NewGroupDialog.vue';

/**
 * Groups (List template, admin): named sets of users that roles are granted to. Creating a group
 * opens it, since a new group is only useful once it has members and roles.
 */
const router = useRouter();
const view = useListView(['name', 'members'] as const, 'name');
const { q, draft, chips, chipLabels, sort } = view;

const groups = useApiQuery<CCFGroup[]>('/api/admin/groups');

const rows = computed(() =>
  view.sortRows(
    (groups.data.value ?? [])
      .filter((g) => matches(q.value, g.name, g.description))
      .map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? '',
        // Zero-padded so the natural sort orders counts numerically.
        members: String(g.memberCount ?? 0).padStart(6, '0'),
        count: g.memberCount ?? 0,
      })),
    'name',
  ),
);

const status = computed(() =>
  groups.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : groups.status.value,
);
const summary = computed(() => {
  if (!q.value || groups.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'group')} match.`
    : 'No groups match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'description', label: 'Description' },
  {
    key: 'members',
    label: 'Members',
    sortable: true,
    align: 'end',
    initialDirection: 'descending',
  },
];

const creating = ref(false);
function created(group: CCFGroup): void {
  void router.push({ name: 'admin-group-view', params: { id: group.id } });
}
</script>

<template>
  <ListTemplate
    title="Groups"
    description="Sets of users that roles are granted to."
  >
    <template #actions>
      <Button variant="primary" icon="add" @click="creating = true"
        >New group</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter groups"
        search-label="Search groups"
        search-placeholder="Name or description"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="groups"
      empty-title="No groups yet"
      empty-body="Group users by team or function, then grant each group the roles it needs."
      icon="people"
      :filters="chipLabels"
      @retry="groups.retry"
      @clear-filters="view.clearSearch()"
    >
      <template #empty-actions>
        <Button variant="primary" icon="add" @click="creating = true"
          >New group</Button
        >
      </template>
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'group')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <TextLink :to="{ name: 'admin-group-view', params: { id: r.id } }">{{
            r.name
          }}</TextLink>
        </template>
        <template #cell-description="{ row: r }">{{
          r.description || 'None'
        }}</template>
        <template #cell-members="{ row: r }">{{ r.count }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <NewGroupDialog v-model:open="creating" @created="created" />
</template>
