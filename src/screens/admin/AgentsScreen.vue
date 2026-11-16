<script setup lang="ts">
/**
 * Agents (/admin/agents, List template): the agents that collect evidence, with status, key count
 * and last sign-in; each opens its page. Search by name or description (in the address). Admins
 * can register one; registration stays hidden for everyone else (R40).
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import type { Agent } from '@/types/agents';
import { formatDate, formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import AgentForm from './AgentForm.vue';
import { useAgentAdmin } from './agentAdmin';

const router = useRouter();
const toast = useToast();
const { isAdmin } = useAgentAdmin();

const view = useListView(['name', 'lastAuth', 'created'] as const, 'name');
const { q, draft, chips, chipLabels, sort } = view;

const agents = useApiQuery<Agent[]>('/api/admin/agents');

const rows = computed(() =>
  view.sortRows(
    (agents.data.value ?? [])
      .filter((a) => matches(q.value, a.name, a.description ?? ''))
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description ?? '',
        status: a.isActive ? 'Active' : 'Inactive',
        keys: a.serviceAccountKeyCount,
        lastAuth: a.lastAuthenticatedAt ?? '',
        created: a.createdAt,
      })),
    'name',
  ),
);

const status = computed(() =>
  agents.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : agents.status.value,
);
const summary = computed(() => {
  if (!q.value || agents.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'agent')} match.`
    : 'No agents match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Agent', sortable: true, minWidth: 'sm' },
  { key: 'status', label: 'Status' },
  { key: 'keys', label: 'Keys', align: 'end' },
  {
    key: 'lastAuth',
    label: 'Last signed in',
    sortable: true,
    initialDirection: 'descending',
  },
  {
    key: 'created',
    label: 'Registered',
    sortable: true,
    initialDirection: 'descending',
  },
];

const creating = ref(false);
function created(agent: Agent) {
  creating.value = false;
  toast.add({
    severity: 'success',
    summary: 'Agent registered',
    detail: `${agent.name} was registered. Create a key so it can sign in.`,
    life: 4000,
  });
  void router.push({ name: 'admin-agent-keys', params: { id: agent.id } });
}
</script>

<template>
  <ListTemplate
    title="Agents"
    description="The agents that collect evidence: their keys and configuration."
  >
    <template v-if="isAdmin" #actions>
      <Button variant="primary" icon="add" @click="creating = true"
        >Register agent</Button
      >
    </template>
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter agents"
        search-label="Search agents"
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
      subject="agents"
      empty-title="No agents yet"
      :empty-body="
        isAdmin
          ? 'Register an agent, then create a key for it to sign in with.'
          : 'An administrator registers agents.'
      "
      icon="agents"
      :filters="chipLabels"
      @retry="agents.retry"
      @clear-filters="view.clearSearch()"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'agent')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <TextLink :to="{ name: 'admin-agent', params: { id: r.id } }">{{
            r.name
          }}</TextLink>
        </template>
        <template #cell-status="{ row: r }"><Tag :label="r.status" /></template>
        <template #cell-lastAuth="{ row: r }">{{
          r.lastAuth ? formatDateTime(r.lastAuth) : 'Never'
        }}</template>
        <template #cell-created="{ row: r }">{{
          formatDate(r.created)
        }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <Dialog v-model:open="creating" title="Register agent">
    <AgentForm v-if="creating" @cancel="creating = false" @saved="created" />
  </Dialog>
</template>
