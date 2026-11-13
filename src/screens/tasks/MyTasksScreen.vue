<script setup lang="ts">
/**
 * My tasks (List template): workflow steps assigned to the signed-in user, unresolved and soonest
 * due first. A step opens in the classic step panel (a legacy island), which also reassigns it.
 * The script is the classic page's; the template and the helpers at the end are new.
 */
import { computed, ref, watch, onMounted } from 'vue';
import { useMyAssignments } from '@/composables/workflows/useMyAssignments';
import type { StepExecution } from '@/types/workflows';
import { REASSIGNABLE_STEP_EXECUTION_STATUSES } from '@/types/workflows';
import StepExecutionPanel from '@/views/workflow-executions/partials/StepExecutionPanel.vue';
import { plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';

const { assignments, total, loading, error, fetchMyAssignments } =
  useMyAssignments();

const statusFilter = ref('');
const dueAfterFilter = ref('');
const dueBeforeFilter = ref('');
const limit = ref(10);
const offset = ref(0);
const hasMore = ref(false);
const selectedStep = ref<StepExecution | null>(null);
const showStepPanel = ref(false);
const openReassignOnPanelOpen = ref(false);

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Skipped', value: 'skipped' },
];

const sortedAssignments = computed(() => {
  if (!assignments.value || assignments.value.length === 0) return [];

  const unresolved = new Set(['pending', 'blocked', 'in_progress', 'overdue']);

  return [...assignments.value].sort((a, b) => {
    const aUnresolved = unresolved.has(a.status);
    const bUnresolved = unresolved.has(b.status);

    if (aUnresolved !== bUnresolved) {
      return aUnresolved ? -1 : 1;
    }

    const aDue = getEffectiveDueDate(a);
    const bDue = getEffectiveDueDate(b);
    if (aDue && bDue) {
      return new Date(aDue).getTime() - new Date(bDue).getTime();
    }
    if (aDue) return -1;
    if (bDue) return 1;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
});

async function loadAssignments() {
  try {
    const response = await fetchMyAssignments({
      status: statusFilter.value || undefined,
      dueAfter: dueAfterFilter.value || undefined,
      dueBefore: dueBeforeFilter.value || undefined,
      limit: limit.value,
      offset: offset.value,
    });
    hasMore.value = response.hasMore;
  } catch (err) {
    console.error('[MyTasksView] Failed to load assignments:', err);
    hasMore.value = false;
  }
}

function nextPage() {
  offset.value += limit.value;
  loadAssignments();
}

function previousPage() {
  offset.value = Math.max(0, offset.value - limit.value);
  loadAssignments();
}

function openStepPanel(step: StepExecution) {
  openReassignOnPanelOpen.value = false;
  selectedStep.value = step;
  showStepPanel.value = true;
}

function openReassignPanel(step: StepExecution) {
  openReassignOnPanelOpen.value = true;
  selectedStep.value = step;
  showStepPanel.value = true;
}

function handleStepUpdated() {
  loadAssignments();
}

function canQuickReassign(step: StepExecution): boolean {
  return REASSIGNABLE_STEP_EXECUTION_STATUSES.includes(step.status);
}

function getStepName(step: StepExecution): string {
  return (
    step.workflowStepDefinition?.name ||
    step.stepDefinition?.name ||
    'Unnamed Step'
  );
}

function getStepDescription(step: StepExecution): string | undefined {
  return (
    step.workflowStepDefinition?.description || step.stepDefinition?.description
  );
}

function getWorkflowName(step: StepExecution): string {
  return (
    step.workflowExecution?.workflowInstance?.workflowDefinition?.name ||
    step.workflowExecution?.workflowInstance?.name ||
    'Unknown Workflow'
  );
}

function getEffectiveDueDate(step: StepExecution): string | undefined {
  return step.dueDate || step.workflowExecution?.dueDate;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

watch(statusFilter, () => {
  offset.value = 0;
  loadAssignments();
});

watch([dueAfterFilter, dueBeforeFilter], () => {
  offset.value = 0;
  loadAssignments();
});

watch(showStepPanel, (visible) => {
  if (!visible) {
    openReassignOnPanelOpen.value = false;
  }
});

onMounted(() => {
  loadAssignments();
});

// Design-system view ---------------------------------------------------------------------------

const stepStatus = (status: string) =>
  `step-${status.replace(/_/g, '-')}` as StatusKey;

const status = computed<QueryStatus>(() => {
  if (error.value) return 'error';
  if (loading.value && !assignments.value?.length) return 'loading';
  return sortedAssignments.value.length ? 'ready' : 'empty';
});

const chips = computed(() => [
  ...(statusFilter.value
    ? [
        {
          label: `Status: ${statusOptions.find((o) => o.value === statusFilter.value)?.label}`,
          clear: () => (statusFilter.value = ''),
        },
      ]
    : []),
  ...(dueAfterFilter.value
    ? [
        {
          label: `Due after ${formatDate(dueAfterFilter.value)}`,
          clear: () => (dueAfterFilter.value = ''),
        },
      ]
    : []),
  ...(dueBeforeFilter.value
    ? [
        {
          label: `Due before ${formatDate(dueBeforeFilter.value)}`,
          clear: () => (dueBeforeFilter.value = ''),
        },
      ]
    : []),
]);
function clearFilters(): void {
  statusFilter.value = '';
  dueAfterFilter.value = '';
  dueBeforeFilter.value = '';
}

const rows = computed(() =>
  sortedAssignments.value.map((step) => {
    const due = getEffectiveDueDate(step);
    return {
      id: step.id,
      step,
      name: getStepName(step),
      description: getStepDescription(step) ?? '',
      workflow: getWorkflowName(step),
      due: due ? formatDate(due) : 'Not set',
      late:
        step.status === 'overdue' ||
        (Boolean(due) && Date.parse(due!) < Date.now()),
    };
  }),
);

function rowActions(step: StepExecution): MenuEntry[] {
  return [
    { label: 'Open', icon: 'next', onSelect: () => openStepPanel(step) },
    {
      label: 'Reassign',
      icon: 'person',
      disabledReason: canQuickReassign(step)
        ? undefined
        : 'Only unfinished steps can be reassigned.',
      onSelect: () => openReassignPanel(step),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="My Tasks"
    description="Workflow steps assigned to you, unresolved and soonest due first."
  >
    <template #actions>
      <Button icon="refresh" :loading="loading" @click="loadAssignments"
        >Refresh</Button
      >
    </template>

    <template #filters>
      <FilterBar
        label="Filter tasks"
        :chips="chips"
        :summary="
          chips.length && status === 'ready'
            ? `${plural(total, 'task')} match.`
            : ''
        "
        @remove="(index) => chips[index]!.clear()"
        @clear="clearFilters"
      >
        <FormField label="Status">
          <Select
            v-model="statusFilter"
            :options="
              statusOptions.map((o) => ({ value: o.value, label: o.label }))
            "
          />
        </FormField>
        <FormField label="Due after">
          <TextInput v-model="dueAfterFilter" type="date" />
        </FormField>
        <FormField label="Due before">
          <TextInput v-model="dueBeforeFilter" type="date" />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="status"
      subject="your tasks"
      empty-title="No tasks for you"
      empty-body="Steps assigned to you by workflow runs appear here."
      icon="workflows"
      :error-message="error ? String(error) : undefined"
      :filters="chips.map((chip) => chip.label)"
      @retry="loadAssignments"
      @clear-filters="clearFilters"
    >
      <Stack gap="4">
        <DataTable
          :caption="plural(total, 'assigned task')"
          caption-hidden
          :columns="[
            { key: 'name', label: 'Step', minWidth: 'md' },
            { key: 'workflow', label: 'Workflow' },
            { key: 'status', label: 'Status', nowrap: true },
            { key: 'due', label: 'Due', nowrap: true },
          ]"
          :rows="rows"
          :row-key="(r) => r.id"
        >
          <template #cell-name="{ row: r }">
            <Stack gap="1">
              <Button variant="tertiary" wrap @click="openStepPanel(r.step)">{{
                r.name
              }}</Button>
              <Text v-if="r.description" as="span" variant="caption">{{
                r.description
              }}</Text>
            </Stack>
          </template>
          <template #cell-status="{ row: r }">
            <StatusBadge :status="stepStatus(r.step.status)" />
          </template>
          <template #cell-due="{ row: r }">
            <Stack gap="1">
              {{ r.due }}
              <Tag v-if="r.late" label="Late" />
            </Stack>
          </template>
          <template #actions="{ row: r }">
            <Menu
              :label="`Actions for ${r.name}`"
              :items="rowActions(r.step)"
            />
          </template>
        </DataTable>
        <Cluster v-if="hasMore || offset > 0" justify="between" gap="3">
          <Button
            icon="back"
            :disabled-reason="
              offset === 0 ? 'This is the first page.' : undefined
            "
            @click="previousPage"
            >Previous</Button
          >
          <Text as="span" variant="caption"
            >{{ offset + 1 }}–{{
              Math.min(offset + assignments.length, total)
            }}
            of {{ total }}</Text
          >
          <Button
            icon-end="next"
            :disabled-reason="hasMore ? undefined : 'This is the last page.'"
            @click="nextPage"
            >Next</Button
          >
        </Cluster>
      </Stack>
    </DataState>
  </ListTemplate>

  <StepExecutionPanel
    v-model:visible="showStepPanel"
    :step="selectedStep"
    :open-reassign-on-open="openReassignOnPanelOpen"
    @step-updated="handleStepUpdated"
  />
</template>
