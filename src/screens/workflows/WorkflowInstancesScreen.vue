<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowInstance,
} from '@/types/workflows';
import { usePermissionsStore } from '@/stores/permissions';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';
import { formatDate, plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
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
import NewInstanceDialog from './NewInstanceDialog.vue';
import {
  cadenceLabel,
  readView,
  viewQuery,
  type InstancesView,
} from './workflowInstances';

/**
 * This System > Workflow Instances: the workflows that run for this system, how often, and
 * when they last ran. Filter by definition and status (in the URL); create, run or delete an
 * instance. An instance and its runs open on their existing pages for now.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();

const systemId = String(route.params.systemId);
const view = computed(() => readView(route.query));

function withView(next: InstancesView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of ['definition', 'status', 'q']) delete query[key];
  return { ...query, ...viewQuery(next) };
}
function go(patch: Partial<InstancesView>): void {
  void router.push({ query: withView({ ...view.value, ...patch }) });
}

// Data ----------------------------------------------------------------------------------------

const definitions = ref<WorkflowDefinition[]>([]);
const instances = ref<WorkflowInstance[]>([]);
const status = ref<QueryStatus>('loading');

async function loadDefinitions(): Promise<void> {
  try {
    const response = await api.get<DataResponse<WorkflowDefinition[]>>(
      '/api/workflows/definitions',
    );
    definitions.value = response.data.data ?? [];
  } catch {
    definitions.value = [];
  }
}

let latest = 0;
async function load(): Promise<void> {
  const request = ++latest;
  status.value = 'loading';
  try {
    // The classic list's query parameters (snake_case, as the API expects).
    const params: Record<string, string> = { system_id: systemId };
    if (view.value.definition)
      params.workflow_definition_id = view.value.definition;
    if (view.value.status)
      params.is_active = String(view.value.status === 'active');
    const response = await api.get<DataResponse<WorkflowInstance[]>>(
      '/api/workflows/instances',
      { params },
    );
    if (request !== latest) return;
    instances.value = response.data.data ?? [];
    status.value = instances.value.length ? 'ready' : 'empty';
  } catch (error) {
    if (request !== latest) return;
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}

void loadDefinitions();
// The name search filters in the browser; definition and status are API filters.
watch(
  () => `${view.value.definition}|${view.value.status}`,
  () => void load(),
  { immediate: true },
);
const draft = ref(view.value.q);
watch(
  () => view.value.q,
  (q) => (draft.value = q),
);

// Filters -------------------------------------------------------------------------------------

const definitionOptions = computed(() => [
  { value: '', label: 'Any definition' },
  ...definitions.value.map((d) => ({ value: d.id, label: d.name })),
]);
const statusOptions = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];
const chips = computed(() => [
  ...(view.value.q
    ? [{ label: `Search: ${view.value.q}`, remove: { q: '' } }]
    : []),
  ...(view.value.definition
    ? [
        {
          label: `Definition: ${definitions.value.find((d) => d.id === view.value.definition)?.name ?? 'Unknown'}`,
          remove: { definition: '' },
        },
      ]
    : []),
  ...(view.value.status
    ? [
        {
          label: `Status: ${view.value.status === 'active' ? 'Active' : 'Inactive'}`,
          remove: { status: '' as const },
        },
      ]
    : []),
]);

// Table ---------------------------------------------------------------------------------------

const rows = computed(() =>
  instances.value
    .filter(
      (i) =>
        !view.value.q ||
        i.name.toLowerCase().includes(view.value.q.toLowerCase()),
    )
    .map((instance) => ({
      id: instance.id,
      instance,
      definition:
        instance.workflowDefinition?.name ?? instance.workflowDefinitionId,
      cadence: cadenceLabel(instance.cadence),
      status: instance.isActive ? 'Active' : 'Inactive',
      lastRun: instance.lastExecutionAt
        ? formatDate(instance.lastExecutionAt)
        : 'Never',
    })),
);

// Actions -------------------------------------------------------------------------------------

const createDenied = computed(() =>
  permissions.can(RESOURCES.WORKFLOW_INSTANCE, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating workflow instances.",
);
const creating = ref(false);

const toRun = ref<WorkflowInstance>();
const toDelete = ref<WorkflowInstance>();
const confirmRun = computed({
  get: () => Boolean(toRun.value),
  set: (open: boolean) => {
    if (!open) toRun.value = undefined;
  },
});
const confirmDelete = computed({
  get: () => Boolean(toDelete.value),
  set: (open: boolean) => {
    if (!open) toDelete.value = undefined;
  },
});

function rowActions(instance: WorkflowInstance): MenuEntry[] {
  return [
    {
      label: 'Run now',
      icon: 'next',
      disabledReason: !instance.isActive
        ? 'Only an active instance can run.'
        : permissions.can(RESOURCES.WORKFLOW_EXECUTION, ACTIONS.CREATE)
          ? undefined
          : "Your access doesn't include running workflows.",
      onSelect: () => (toRun.value = instance),
    },
    {
      label: 'Open',
      icon: 'external',
      to: { name: 'workflow-instance-editor', params: { id: instance.id } },
    },
    {
      label: 'Delete',
      icon: 'delete',
      tone: 'danger',
      disabledReason: permissions.can(
        RESOURCES.WORKFLOW_INSTANCE,
        ACTIONS.DELETE,
      )
        ? undefined
        : "Your access doesn't include deleting workflow instances.",
      onSelect: () => (toDelete.value = instance),
    },
  ];
}

async function run(): Promise<void> {
  const instance = toRun.value;
  toRun.value = undefined;
  if (!instance) return;
  try {
    const response = await api.post<DataResponse<WorkflowExecution>>(
      '/api/workflows/executions',
      { workflowInstanceId: instance.id },
      { transformRequest: [decamelizeKeys] },
    );
    await router.push({
      name: 'workflow-execution-view',
      params: { id: response.data.data.id },
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The workflow didn't start",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

async function remove(): Promise<void> {
  const instance = toDelete.value;
  toDelete.value = undefined;
  if (!instance) return;
  try {
    await api.delete(`/api/workflows/instances/${instance.id}`);
    instances.value = instances.value.filter((i) => i.id !== instance.id);
    if (!instances.value.length) status.value = 'empty';
    toast.add({
      severity: 'success',
      summary: 'Instance deleted',
      detail: `${instance.name} and its runs were deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The instance wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function created(instance: WorkflowInstance): void {
  void router.push({
    name: 'workflow-instance-editor',
    params: { id: instance.id },
  });
}
</script>

<template>
  <ListTemplate
    title="Workflow Instances"
    description="The workflows that run for this system."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >New instance</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter workflow instances"
        search-label="Search instances"
        search-placeholder="Name"
        @search="go({ q: draft.trim() })"
        :chips="chips"
        :summary="
          chips.length && status === 'ready'
            ? `${plural(rows.length, 'instance')} match.`
            : ''
        "
        @remove="(index) => go(chips[index]!.remove)"
        @clear="go({ definition: '', status: '', q: '' })"
      >
        <FormField label="Definition">
          <Select
            :model-value="view.definition"
            :options="definitionOptions"
            @update:model-value="(value) => go({ definition: value })"
          />
        </FormField>
        <FormField label="Status">
          <Select
            :model-value="view.status"
            :options="statusOptions"
            @update:model-value="
              (value) => go({ status: value as InstancesView['status'] })
            "
          />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="status === 'ready' && !rows.length ? 'empty' : status"
      subject="workflow instances"
      empty-title="No workflow instances yet"
      empty-body="A workflow instance runs a workflow definition for this system on a schedule, creating tasks for each of its steps."
      icon="workflows"
      :filters="chips.map((c) => c.label)"
      @retry="load"
      @clear-filters="go({ definition: '', status: '', q: '' })"
    >
      <template #empty-actions>
        <Button
          variant="primary"
          icon="add"
          :disabled-reason="createDenied"
          @click="creating = true"
          >New instance</Button
        >
      </template>
      <DataTable
        caption="Workflow instances for this system"
        caption-hidden
        :columns="[
          { key: 'name', label: 'Name', minWidth: 'md' },
          { key: 'definition', label: 'Definition' },
          { key: 'cadence', label: 'Runs', nowrap: true },
          { key: 'status', label: 'Status', nowrap: true },
          { key: 'lastRun', label: 'Last run', nowrap: true },
        ]"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <Stack gap="1">
            <TextLink
              :to="{ name: 'workflow-instance-editor', params: { id: r.id } }"
              >{{ r.instance.name }}</TextLink
            >
            <Text v-if="r.instance.description" as="span" variant="caption">{{
              r.instance.description
            }}</Text>
          </Stack>
        </template>
        <template #cell-definition="{ row: r }">
          <TextLink
            v-if="r.instance.workflowDefinition"
            :to="{
              name: 'workflow-definition-editor',
              params: { id: r.instance.workflowDefinitionId },
            }"
            >{{ r.definition }}</TextLink
          >
          <template v-else>{{ r.definition }}</template>
        </template>
        <template #cell-status="{ row: r }"><Tag :label="r.status" /></template>
        <template #actions="{ row: r }">
          <Menu
            :label="`Actions for ${r.instance.name}`"
            :items="rowActions(r.instance)"
          />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <NewInstanceDialog
    v-model:open="creating"
    :system-id="systemId"
    :definitions="definitions"
    :definition-id="view.definition || undefined"
    @created="created"
  />
  <ConfirmDialog
    v-model:open="confirmRun"
    title="Run this workflow now?"
    confirm-label="Run now"
    tone="primary"
    @confirm="run"
    ><Text
      >A new run of {{ toRun?.name }} starts and creates tasks for every step in
      its definition.</Text
    ></ConfirmDialog
  >
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.name ?? 'this instance'}?`"
    confirm-label="Delete instance"
    @confirm="remove"
    ><Text
      >This also deletes all of its runs. It can't be undone.</Text
    ></ConfirmDialog
  >
</template>
