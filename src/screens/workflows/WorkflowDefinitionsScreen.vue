<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { WorkflowDefinition } from '@/types/workflows';
import { usePermissionsStore } from '@/stores/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import NewDefinitionDialog from './NewDefinitionDialog.vue';
import { cadenceLabel } from './workflowInstances';

/**
 * Workflow definitions (List template): the templates that systems run as workflow instances.
 * Search, status and sort live in the URL; the classic status filter didn't apply, this one does.
 */
const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'deprecated', label: 'Deprecated' },
];

const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();

const view = useListView(['name', 'version', 'steps'] as const, 'name');
const { q, draft, sort } = view;

const statusFilter = computed(
  () =>
    STATUSES.find((s) => s.value && s.value === route.query.status)?.value ??
    '',
);
function setStatus(status: string): void {
  void router.push({ query: { ...route.query, status: status || undefined } });
}
const chips = computed(() => [
  ...view.chips.value.map((chip) => ({ ...chip, clear: view.clearSearch })),
  ...(statusFilter.value
    ? [
        {
          label: `Status: ${STATUSES.find((s) => s.value === statusFilter.value)!.label}`,
          clear: () => setStatus(''),
        },
      ]
    : []),
]);
function clearAll(): void {
  void router.push({
    query: { ...route.query, q: undefined, status: undefined },
  });
}

const definitions = useApiQuery<WorkflowDefinition[]>(
  '/api/workflows/definitions',
);

const rows = computed(() =>
  view.sortRows(
    (definitions.data.value ?? [])
      .filter((d) => matches(q.value, d.name, d.description))
      .filter((d) => !statusFilter.value || d.status === statusFilter.value)
      .map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? '',
        version: d.version || '1.0.0',
        cadence: d.suggestedCadence ? cadenceLabel(d.suggestedCadence) : '',
        status: d.status,
        // Zero-padded so the natural sort orders counts numerically.
        steps: String(d.stepCount ?? 0).padStart(6, '0'),
        stepCount: d.stepCount ?? 0,
      })),
    'name',
  ),
);
type Row = (typeof rows.value)[number];

const status = computed(() =>
  definitions.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : definitions.status.value,
);
const summary = computed(() => {
  if (!chips.value.length || definitions.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'definition')} match.`
    : 'No definitions match.';
});

/** The definitions API doesn't return a status yet, so status shows only once it does. */
const hasStatus = computed(() =>
  (definitions.data.value ?? []).some((d) => d.status),
);

const columns = computed<DataTableColumn[]>(() => [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'md' },
  { key: 'version', label: 'Version', sortable: true, nowrap: true },
  { key: 'cadence', label: 'Suggested cadence', nowrap: true },
  ...(hasStatus.value
    ? [{ key: 'status', label: 'Status', nowrap: true }]
    : []),
  {
    key: 'steps',
    label: 'Steps',
    sortable: true,
    align: 'end',
    initialDirection: 'descending',
  },
]);

const createDenied = computed(() =>
  permissions.can(RESOURCES.WORKFLOW_DEFINITION, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating workflow definitions.",
);
const deleteDenied = computed(() =>
  permissions.can(RESOURCES.WORKFLOW_DEFINITION, ACTIONS.DELETE)
    ? undefined
    : "Your access doesn't include deleting workflow definitions.",
);

const creating = ref(false);
function created(definition: WorkflowDefinition): void {
  void router.push({
    name: 'workflow-definition-editor',
    params: { id: definition.id },
  });
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
    await api.delete(`/api/workflows/definitions/${row.id}`);
    definitions.data.value = (definitions.data.value ?? []).filter(
      (d) => d.id !== row.id,
    );
    toast.add({
      severity: 'success',
      summary: 'Definition deleted',
      detail: `${row.name} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The definition wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function rowActions(row: Row): MenuEntry[] {
  return [
    {
      label: 'Delete definition',
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
    title="Workflow Definitions"
    description="Templates for recurring compliance work. Systems run them as workflow instances."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >New definition</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter workflow definitions"
        search-label="Search definitions"
        search-placeholder="Name or description"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="(index) => chips[index]!.clear()"
        @clear="clearAll"
      >
        <FormField v-if="hasStatus || statusFilter" label="Status">
          <Select
            :model-value="statusFilter"
            :options="STATUSES"
            @update:model-value="setStatus"
          />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="status"
      subject="workflow definitions"
      empty-title="No workflow definitions yet"
      empty-body="A workflow definition is a template of steps, such as a quarterly access review. Systems run definitions as workflow instances on a schedule."
      icon="workflows"
      :filters="chips.map((chip) => chip.label)"
      @retry="definitions.retry"
      @clear-filters="clearAll"
    >
      <template #empty-actions>
        <Button
          variant="primary"
          icon="add"
          :disabled-reason="createDenied"
          @click="creating = true"
          >New definition</Button
        >
      </template>
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'workflow definition')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Stack gap="1">
            <TextLink
              :to="{ name: 'workflow-definition-editor', params: { id: r.id } }"
              >{{ r.name }}</TextLink
            >
            <Text v-if="r.description" variant="caption">{{
              r.description
            }}</Text>
          </Stack>
        </template>
        <template #cell-cadence="{ row: r }">{{
          r.cadence || 'None'
        }}</template>
        <template #cell-status="{ row: r }"
          ><Tag v-if="r.status" :label="r.status" /><template v-else
            >Not set</template
          ></template
        >
        <template #cell-steps="{ row: r }">{{ r.stepCount }}</template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="rowActions(r)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <NewDefinitionDialog v-model:open="creating" @created="created" />

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.name ?? 'this definition'}?`"
    confirm-label="Delete definition"
    @confirm="remove"
    ><Text>This can't be undone.</Text></ConfirmDialog
  >
</template>
