<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { SystemSecurityPlan } from '@/oscal';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';

/**
 * POA&M items (List template): CCF's plan-of-action items across systems, e.g. risks promoted
 * for remediation. System, status and title search live in the URL. Read only, as before.
 */
interface PoamItem {
  id: string;
  sspId: string;
  title: string;
  description?: string;
  status: string;
  deadline?: string | null;
  updatedAt: string;
}

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];
const statusLabel = (value: string) =>
  STATUSES.find((s) => s.value === value)?.label ?? value;

const route = useRoute();
const router = useRouter();
const view = useListView(
  ['title', 'deadline', 'updated'] as const,
  'updated',
  'descending',
);
const { q, draft, sort } = view;

const items = useApiQuery<PoamItem[]>('/api/poam-items');
const plans = useApiQuery<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const systemOptions = computed(() =>
  (plans.data.value ?? [])
    .map((plan) => ({ value: plan.uuid, label: plan.metadata.title }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
const systemTitle = (id: string) =>
  systemOptions.value.find((o) => o.value === id)?.label ?? 'Unknown system';

const system = computed(() => String(route.query.system ?? ''));
const status = computed(() =>
  STATUSES.some((s) => s.value && s.value === route.query.status)
    ? String(route.query.status)
    : '',
);
function set(patch: { system?: string; status?: string; q?: string }): void {
  const query = { ...route.query };
  for (const [key, value] of Object.entries(patch))
    query[key] = value || undefined!;
  void router.push({ query });
}

const chips = computed(() => [
  ...(q.value
    ? [{ label: `Search: ${q.value}`, clear: () => set({ q: '' }) }]
    : []),
  ...(system.value
    ? [
        {
          label: `System: ${systemTitle(system.value)}`,
          clear: () => set({ system: '' }),
        },
      ]
    : []),
  ...(status.value
    ? [
        {
          label: `Status: ${statusLabel(status.value)}`,
          clear: () => set({ status: '' }),
        },
      ]
    : []),
]);
const clearAll = () => set({ q: '', system: '', status: '' });

const rows = computed(() =>
  view.sortRows(
    (items.data.value ?? [])
      .filter((item) => matches(q.value, item.title, item.description))
      .filter((item) => !system.value || item.sspId === system.value)
      .filter((item) => !status.value || item.status === status.value)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? '',
        system: systemTitle(item.sspId),
        status: statusLabel(item.status),
        deadline: item.deadline ?? '',
        updated: item.updatedAt,
      })),
    'title',
  ),
);

const listStatus = computed(() =>
  items.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : items.status.value,
);
const summary = computed(() => {
  if (!chips.value.length || items.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'item')} match.`
    : 'No items match.';
});

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Item', sortable: true, minWidth: 'md' },
  { key: 'system', label: 'System' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'deadline', label: 'Deadline', sortable: true, nowrap: true },
  {
    key: 'updated',
    label: 'Updated',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];
</script>

<template>
  <ListTemplate
    title="POA&M Items"
    description="Planned actions to resolve weaknesses, across every system."
  >
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter POA&M items"
        search-label="Search items"
        search-placeholder="Title or description"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="(index) => chips[index]!.clear()"
        @clear="clearAll"
      >
        <FormField label="System">
          <Select
            :model-value="system"
            :options="[{ value: '', label: 'Any system' }, ...systemOptions]"
            @update:model-value="(value) => set({ system: value })"
          />
        </FormField>
        <FormField label="Status">
          <Select
            :model-value="status"
            :options="STATUSES"
            @update:model-value="(value) => set({ status: value })"
          />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="listStatus"
      subject="POA&M items"
      empty-title="No POA&M items yet"
      empty-body="Items are added when a risk is promoted for remediation, each with a deadline and an owner."
      icon="assessments"
      :filters="chips.map((chip) => chip.label)"
      @retry="items.retry"
      @clear-filters="clearAll"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'POA&M item')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }">
          <Stack gap="1">
            <Text as="span">{{ r.title }}</Text>
            <Text v-if="r.description" as="span" variant="caption">{{
              r.description
            }}</Text>
          </Stack>
        </template>
        <template #cell-status="{ row: r }"><Tag :label="r.status" /></template>
        <template #cell-deadline="{ row: r }">{{
          r.deadline ? formatDate(r.deadline) : 'Not set'
        }}</template>
        <template #cell-updated="{ row: r }">{{
          formatDate(r.updated)
        }}</template>
      </DataTable>
    </DataState>
  </ListTemplate>
</template>
