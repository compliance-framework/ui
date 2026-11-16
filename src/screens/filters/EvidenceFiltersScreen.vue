<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { SystemSecurityPlan } from '@/oscal';
import { serializeFilter } from '@/parsers/labelfilter';
import type { Dashboard } from '@/stores/filters';
import { usePermissionsStore } from '@/stores/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import EvidenceFilterEditDialog from './EvidenceFilterEditDialog.vue';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import FilterTrend from './FilterTrend.vue';

/**
 * Evidence filters (List template): saved evidence searches, each scoped to a system or global and
 * linked to controls and components. Search, scope, control and component live in the URL. A row
 * opens its evidence; its trend opens in a drawer.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();

const view = useListView(['name', 'scope'] as const, 'name');
const { q, draft, sort } = view;

const filters = useApiQuery<Dashboard[]>('/api/filters');
const plans = useApiQuery<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const keyOf = (filter: Dashboard) => filter.id ?? filter.uuid ?? filter.name;
const systemTitle = (id: string) =>
  plans.data.value?.find((plan) => plan.uuid === id)?.metadata.title ??
  'Unknown system';
const scopeLabel = (filter: Dashboard) =>
  filter.sspId ? systemTitle(filter.sspId) : 'Global';

// Filters (URL) --------------------------------------------------------------------------------

/** `scope` is a system UUID, or `global` for filters without one. */
const scope = computed(() => String(route.query.scope ?? ''));
const control = computed(() => String(route.query.control ?? ''));
const component = computed(() => String(route.query.component ?? ''));
function set(patch: Record<string, string>): void {
  const query = { ...route.query };
  for (const [key, value] of Object.entries(patch))
    query[key] = value || undefined!;
  void router.push({ query });
}

const scopeOptions = computed(() => [
  { value: '', label: 'Any scope' },
  { value: 'global', label: 'Global' },
  ...(plans.data.value ?? [])
    .map((plan) => ({ value: plan.uuid, label: plan.metadata.title }))
    .sort((a, b) => a.label.localeCompare(b.label)),
]);
const controlOptions = computed(() => {
  const byId = new Map<string, string>();
  for (const filter of filters.data.value ?? [])
    for (const c of filter.controls ?? []) byId.set(c.id, c.title ?? c.id);
  return [
    { value: '', label: 'Any control' },
    ...[...byId]
      .map(([id, title]) => ({ value: id, label: `${id}: ${title}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
});
const componentOptions = computed(() => {
  const byId = new Map<string, string>();
  for (const filter of filters.data.value ?? [])
    for (const c of filter.components ?? [])
      byId.set(c.uuid, c.title ?? c.uuid);
  return [
    { value: '', label: 'Any component' },
    ...[...byId]
      .map(([id, title]) => ({ value: id, label: title }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
});
const optionLabel = (
  options: { value: string; label: string }[],
  value: string,
) => options.find((o) => o.value === value)?.label ?? value;

const chips = computed(() => [
  ...(q.value
    ? [{ label: `Search: ${q.value}`, clear: () => set({ q: '' }) }]
    : []),
  ...(scope.value
    ? [
        {
          label: `Scope: ${optionLabel(scopeOptions.value, scope.value)}`,
          clear: () => set({ scope: '' }),
        },
      ]
    : []),
  ...(control.value
    ? [
        {
          label: `Control: ${control.value}`,
          clear: () => set({ control: '' }),
        },
      ]
    : []),
  ...(component.value
    ? [
        {
          label: `Component: ${optionLabel(componentOptions.value, component.value)}`,
          clear: () => set({ component: '' }),
        },
      ]
    : []),
]);
const clearAll = () => set({ q: '', scope: '', control: '', component: '' });

// Results --------------------------------------------------------------------------------------

const rows = computed(() =>
  view.sortRows(
    (filters.data.value ?? [])
      .filter((f) => matches(q.value, f.name))
      .filter(
        (f) =>
          !scope.value ||
          (scope.value === 'global' ? !f.sspId : f.sspId === scope.value),
      )
      .filter(
        (f) =>
          !control.value ||
          (f.controls ?? []).some((c) => c.id === control.value),
      )
      .filter(
        (f) =>
          !component.value ||
          (f.components ?? []).some((c) => c.uuid === component.value),
      )
      .map((f) => ({
        id: keyOf(f),
        name: f.name,
        scope: scopeLabel(f),
        followsScope: Boolean(f.scopeBase),
        automatic: f.origin === 'scope-policy',
        controls: f.controls ?? [],
        components: f.components ?? [],
        evidence: evidenceLink(f),
        filter: f,
      })),
    'name',
  ),
);
type Row = (typeof rows.value)[number];

const status = computed(() =>
  filters.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : filters.status.value,
);
const summary = computed(() => {
  if (!chips.value.length || filters.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'filter')} match.`
    : 'No filters match.';
});

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'scope', label: 'Scope', sortable: true },
  { key: 'controls', label: 'Controls' },
  { key: 'components', label: 'Components' },
];

/** A filter's evidence: its system's Evidence page, or the global one. */
function evidenceLink(filter: Dashboard) {
  const query = { filter: serializeFilter(filter.filter) };
  return filter.sspId
    ? { name: 'system-evidence', params: { systemId: filter.sspId }, query }
    : { name: 'evidence:index', query };
}

// Actions --------------------------------------------------------------------------------------

const can = (action: string) => permissions.can(RESOURCES.FILTER, action);
const createDenied = computed(() =>
  can(ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating filters.",
);

const trendOf = ref<Row>();
const trendOpen = computed({
  get: () => Boolean(trendOf.value),
  set: (open: boolean) => {
    if (!open) trendOf.value = undefined;
  },
});

const editOpen = ref(false);
const editing = ref<Dashboard | null>(null);

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
    await api.delete(`/api/filters/${row.filter.id}`);
    filters.data.value = (filters.data.value ?? []).filter(
      (f) => f !== row.filter,
    );
    toast.add({
      severity: 'success',
      summary: 'Filter deleted',
      detail: `${row.name} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The filter wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function rowActions(row: Row): MenuEntry[] {
  return [
    {
      label: 'Show trend',
      icon: 'chart',
      onSelect: () => (trendOf.value = row),
    },
    {
      label: 'Edit',
      icon: 'edit',
      disabledReason: can(ACTIONS.UPDATE)
        ? undefined
        : "Your access doesn't include editing filters.",
      onSelect: () => {
        editing.value = row.filter;
        editOpen.value = true;
      },
    },
    {
      label: 'Delete filter',
      icon: 'delete',
      tone: 'danger',
      disabledReason: can(ACTIONS.DELETE)
        ? undefined
        : "Your access doesn't include deleting filters.",
      onSelect: () => (toDelete.value = row),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="Evidence Filters"
    description="Saved evidence searches, linked to the controls and components they show evidence for."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :to="createDenied ? undefined : { name: 'dashboards.create' }"
        :disabled-reason="createDenied"
        >New filter</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter evidence filters"
        search-label="Search filters"
        search-placeholder="Name"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="(index) => chips[index]!.clear()"
        @clear="clearAll"
      >
        <FormField label="Scope">
          <Select
            :model-value="scope"
            :options="scopeOptions"
            @update:model-value="(value) => set({ scope: value })"
          />
        </FormField>
        <FormField label="Control">
          <Select
            :model-value="control"
            :options="controlOptions"
            @update:model-value="(value) => set({ control: value })"
          />
        </FormField>
        <FormField label="Component">
          <Select
            :model-value="component"
            :options="componentOptions"
            @update:model-value="(value) => set({ component: value })"
          />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="status"
      subject="evidence filters"
      empty-title="No evidence filters yet"
      empty-body="Save a search from an Evidence page to keep it here, with the controls and components it covers."
      icon="filter"
      :filters="chips.map((chip) => chip.label)"
      @retry="filters.retry"
      @clear-filters="clearAll"
    >
      <template #empty-actions>
        <Button :to="{ name: 'evidence:index' }">Go to Evidence</Button>
      </template>
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'evidence filter')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Stack gap="1">
            <TextLink :to="r.evidence">{{ r.name }}</TextLink>
            <Cluster v-if="r.followsScope || r.automatic" gap="1">
              <Tag v-if="r.followsScope" label="Follows scope" />
              <Tag v-if="r.automatic" label="Automatic" />
            </Cluster>
          </Stack>
        </template>
        <template #cell-controls="{ row: r }">
          <Cluster v-if="r.controls.length" gap="1">
            <Tag v-for="c in r.controls" :key="c.id" :label="c.id" />
          </Cluster>
          <template v-else>None</template>
        </template>
        <template #cell-components="{ row: r }">
          <Cluster v-if="r.components.length" gap="1">
            <Tag v-for="c in r.components" :key="c.uuid" :label="c.title" />
          </Cluster>
          <template v-else>None</template>
        </template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="rowActions(r)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <Drawer
    v-model:open="trendOpen"
    :title="trendOf?.name ?? 'Trend'"
    description="Evidence status over time."
  >
    <Stack v-if="trendOf" gap="4">
      <FilterTrend :name="trendOf.name" :filter="trendOf.filter.filter" />
      <CodeBlock
        :code="serializeFilter(trendOf.filter.filter)"
        label="Filter expression"
      />
      <Button :to="trendOf.evidence" icon="evidence">Open its evidence</Button>
    </Stack>
  </Drawer>

  <EvidenceFilterEditDialog
    v-model:visible="editOpen"
    :dashboard="editing"
    @saved="filters.retry"
  />

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.name ?? 'this filter'}?`"
    confirm-label="Delete filter"
    @confirm="remove"
    ><Text
      >Its links to controls and components go too. The evidence itself is
      kept.</Text
    ></ConfirmDialog
  >
</template>
