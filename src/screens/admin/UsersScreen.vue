<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { CCFUser } from '@/stores/types';
import { formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import NewUserDialog from './NewUserDialog.vue';

/**
 * Users (List template, admin): everyone who can sign in, searchable by name or email. Each opens
 * the user's page (groups, roles, account state); New user creates a password account.
 */
const toast = useToast();
const view = useListView(['name', 'email', 'lastLogin'] as const, 'name');
const { q, draft, chips, chipLabels, sort } = view;

const users = useApiQuery<CCFUser[]>('/api/admin/users');

const rows = computed(() =>
  view.sortRows(
    (users.data.value ?? [])
      .filter((u) => matches(q.value, u.email, `${u.firstName} ${u.lastName}`))
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim() || u.email,
        email: u.email,
        lastLogin: u.lastLogin ? String(u.lastLogin) : '',
        locked: Boolean(u.isLocked),
        inactive: u.isActive === false,
      })),
    'name',
  ),
);

const status = computed(() =>
  users.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : users.status.value,
);
const summary = computed(() => {
  if (!q.value || users.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'user')} match.`
    : 'No users match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'lastLogin',
    label: 'Last sign-in',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];

const creating = ref(false);
function created(user: CCFUser): void {
  users.data.value = [...(users.data.value ?? []), user];
  toast.add({
    severity: 'success',
    summary: 'User created',
    detail: `${user.firstName} ${user.lastName} can now sign in.`,
    life: 3000,
  });
}
</script>

<template>
  <ListTemplate title="Users" description="Everyone who can sign in to CCF.">
    <template #actions>
      <Button variant="primary" icon="add" @click="creating = true"
        >New user</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter users"
        search-label="Search users"
        search-placeholder="Name or email"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="users"
      empty-title="No users yet"
      empty-body="Users sign in with a password or through single sign-on."
      icon="users"
      :filters="chipLabels"
      @retry="users.retry"
      @clear-filters="view.clearSearch()"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'user')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Cluster gap="2">
            <TextLink :to="{ name: 'user-view', params: { id: r.id } }">{{
              r.name
            }}</TextLink>
            <Tag v-if="r.locked" label="Locked" />
            <Tag v-if="r.inactive" label="Inactive" />
          </Cluster>
        </template>
        <template #cell-lastLogin="{ row: r }">{{
          r.lastLogin ? formatDateTime(r.lastLogin) : 'Never'
        }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <NewUserDialog v-model:open="creating" @created="created" />
</template>
