<script setup lang="ts">
/**
 * A workflow run (/workflow-executions/:id): its status, dates, step counts and steps. The metrics,
 * step graph, step list and step panel are classic islands. The script is the classic page's,
 * apart from cancelling, which now asks for its reason in a dialog.
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useWorkflowExecutions,
  useStepExecutions,
} from '@/composables/workflows';
import type { StepExecution } from '@/types/workflows';
import ExecutionMetrics from '@/views/workflow-executions/partials/ExecutionMetrics.vue';
import ExecutionDAGView from '@/views/workflow-executions/partials/ExecutionDAGView.vue';
import StepExecutionList from '@/views/workflow-executions/partials/StepExecutionList.vue';
import StepExecutionPanel from '@/views/workflow-executions/partials/StepExecutionPanel.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import { formatDateTime } from '@/ds/format';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();

const route = useRoute();
const router = useRouter();
const {
  execution,
  executionStatus,
  executionMetrics,
  getExecution,
  getExecutionStatus,
  getExecutionMetrics,
  cancelExecution,
  retryExecution,
} = useWorkflowExecutions();
const { stepExecutions, listStepExecutions } = useStepExecutions();

const loading = ref(true);
const error = ref<string | null>(null);
const selectedStep = ref<StepExecution | null>(null);
const showStepPanel = ref(false);

async function loadExecution() {
  const id = route.params.id as string;
  if (!id) {
    error.value = 'No execution ID provided';
    loading.value = false;
    return;
  }

  try {
    loading.value = true;

    // Load execution first
    await getExecution(id);
    if (!execution.value) {
      error.value = 'Execution not found';
      return;
    }

    // Load additional data in parallel, but don't fail if some endpoints don't exist
    await Promise.allSettled([
      getExecutionStatus(id).catch((e) =>
        console.warn('Failed to load execution status:', e),
      ),
      getExecutionMetrics(id).catch((e) =>
        console.warn('Failed to load execution metrics:', e),
      ),
      listStepExecutions({ workflowExecutionId: id }),
    ]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load execution';
  } finally {
    loading.value = false;
  }
}

function handleStepClick(step: StepExecution) {
  selectedStep.value = step;
  showStepPanel.value = true;
}

// Cancelling asks for a reason in a design-system dialog (the classic page used window.prompt).
const cancelling = ref(false);
const cancelReason = ref('');
function handleCancel() {
  cancelReason.value = '';
  cancelling.value = true;
}
async function confirmCancel() {
  if (!execution.value || !cancelReason.value.trim()) return;
  await cancelExecution(execution.value.id, cancelReason.value.trim(), () => {
    loadExecution();
  });
}

async function handleRetry() {
  if (!execution.value) return;

  await retryExecution(execution.value.id, (newExecution) => {
    router.push({
      name: 'workflow-execution-view',
      params: { id: newExecution.id },
    });
  });
}

// Watch for route changes to reload execution when navigating to a different execution
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadExecution();
    }
  },
  { immediate: true },
);

// Design-system view ---------------------------------------------------------------------------

const runStatus = (status: string) =>
  `run-${status.replace(/_/g, '-')}` as StatusKey;
const facts = computed(() => {
  const run = execution.value;
  if (!run) return [];
  const date = (value?: string) => (value ? formatDateTime(value) : '');
  return [
    { key: 'started', label: 'Started', value: date(run.triggeredAt) },
    { key: 'due', label: 'Due', value: date(run.dueDate) },
    { key: 'completed', label: 'Completed', value: date(run.completedAt) },
    ...(run.overdueAt
      ? [{ key: 'overdue', label: 'Overdue since', value: date(run.overdueAt) }]
      : []),
  ].filter((fact) => fact.value);
});
const tiles = computed(() => {
  const s = executionStatus.value;
  if (!s) return [];
  return [
    { key: 'total', label: 'Steps', value: s.totalSteps },
    { key: 'completed', label: 'Completed', value: s.completedSteps },
    { key: 'progress', label: 'In progress', value: s.inProgressSteps },
    { key: 'overdue', label: 'Overdue', value: s.overdueSteps || 0 },
    {
      key: 'pending',
      label: 'Pending',
      value: s.pendingSteps + s.blockedSteps,
    },
    { key: 'failed', label: 'Failed', value: s.failedSteps },
  ];
});
const retryDenied = computed(() =>
  can(RESOURCES.WORKFLOW_EXECUTION, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include retrying runs.",
);
const instanceCrumb = computed(() => ({
  label: execution.value?.workflowInstance?.name || 'Workflow instance',
  to: {
    name: 'workflow-instance-executions',
    params: { id: execution.value?.workflowInstanceId ?? '' },
  },
}));
</script>

<template>
  <DataState
    v-if="!execution"
    :status="loading ? 'loading' : 'error'"
    subject="this run"
    :error-message="error ?? undefined"
    skeleton="panel"
    @retry="loadExecution"
  />
  <Stack v-else gap="6">
    <Breadcrumbs
      v-if="execution.workflowInstanceId"
      :crumbs="[instanceCrumb]"
    />
    <RecordTemplate
      :title="execution.workflowInstance?.name || 'Workflow run'"
      description="One run of a workflow instance."
    >
      <template #status>
        <StatusBadge :status="runStatus(execution.status)" />
      </template>
      <template #facts>
        <DescriptionList :items="facts" layout="inline" />
      </template>
      <template #actions>
        <Button
          v-if="
            (execution.status === 'completed' ||
              execution.status === 'failed') &&
            execution.executionStreamUuid
          "
          icon="evidence"
          :to="{
            name: 'evidence:history',
            params: { uuid: execution.executionStreamUuid },
          }"
          >View evidence stream</Button
        >
        <Button
          v-if="execution.status === 'failed' || execution.status === 'overdue'"
          icon="refresh"
          :disabled-reason="retryDenied"
          @click="handleRetry"
          >Retry run</Button
        >
        <Button
          v-if="
            execution.status === 'in_progress' || execution.status === 'overdue'
          "
          variant="danger"
          icon="close"
          @click="handleCancel"
          >Cancel run</Button
        >
      </template>

      <Stack gap="6">
        <InlineMessage
          v-if="execution.failureReason"
          tone="error"
          title="This run failed"
        >
          <p>{{ execution.failureReason }}</p>
        </InlineMessage>
        <DescriptionList v-if="tiles.length" :items="tiles" />
        <LegacyPage v-if="executionMetrics && executionMetrics.executionId">
          <ExecutionMetrics :metrics="executionMetrics" />
        </LegacyPage>
        <Stack v-if="!stepExecutions || stepExecutions.length === 0" gap="3">
          <Text
            >This run has no steps yet. The API creates them when the run
            starts.</Text
          >
          <Text variant="caption">Run ID: {{ execution.id }}</Text>
          <div>
            <Button icon="refresh" @click="loadExecution">Refresh</Button>
          </div>
        </Stack>
        <LegacyPage v-else>
          <ExecutionDAGView
            :steps="stepExecutions"
            @step-click="handleStepClick"
          />
          <StepExecutionList
            :steps="stepExecutions"
            :execution-status="execution.status"
            @step-click="handleStepClick"
            @refresh="loadExecution"
          />
        </LegacyPage>
      </Stack>
    </RecordTemplate>
  </Stack>

  <StepExecutionPanel
    v-model:visible="showStepPanel"
    :step="selectedStep"
    @step-updated="loadExecution"
  />
  <ConfirmDialog
    v-model:open="cancelling"
    title="Cancel this run?"
    confirm-label="Cancel run"
    cancel-label="Keep running"
    :confirm-disabled-reason="
      cancelReason.trim() ? undefined : 'Say why the run is being cancelled.'
    "
    @confirm="confirmCancel"
  >
    <Stack gap="3">
      <Text>Its open steps stop, and it can't be resumed.</Text>
      <FormField label="Reason" required>
        <Textarea v-model="cancelReason" :rows="3" />
      </FormField>
    </Stack>
  </ConfirmDialog>
</template>
