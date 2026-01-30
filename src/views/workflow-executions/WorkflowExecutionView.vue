<template>
  <div>
    <div class="flex items-center gap-4 mb-4">
      <SecondaryButton @click="goBack">
        <i class="pi pi-arrow-left mr-2"></i>
        Back
      </SecondaryButton>
      <PageHeader class="mb-0">Workflow Execution</PageHeader>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <PageSubHeader>Loading execution details...</PageSubHeader>
      <div class="text-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
      </div>
    </template>

    <!-- Error State -->
    <template v-else-if="error">
      <PageSubHeader>Error loading execution</PageSubHeader>
      <Message severity="error" class="mt-4">
        {{ error }}
      </Message>
      <div class="mt-4">
        <RouterLinkButton :to="{ name: 'workflow-instances:index' }">
          Back to Instances
        </RouterLinkButton>
      </div>
    </template>

    <!-- Execution Loaded -->
    <template v-else-if="execution">
      <PageSubHeader>
        {{ execution.workflowInstance?.name || 'Workflow Execution' }}
      </PageSubHeader>

      <!-- Status and Metadata -->
      <div class="mt-4 flex items-center gap-4">
        <Badge :severity="getStatusSeverity(execution.status)">
          {{ execution.status }}
        </Badge>
        <span class="text-sm text-gray-500 dark:text-slate-400">
          Started: {{ formatDate(execution.triggeredAt) }}
        </span>
        <span
          v-if="execution.completedAt"
          class="text-sm text-gray-500 dark:text-slate-400"
        >
          Completed: {{ formatDate(execution.completedAt) }}
        </span>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex gap-3">
        <SecondaryButton
          v-if="execution.status === 'in_progress'"
          @click="handleCancel"
          severity="danger"
        >
          Cancel Execution
        </SecondaryButton>
        <SecondaryButton
          v-if="execution.status === 'failed'"
          @click="handleRetry"
        >
          Retry Execution
        </SecondaryButton>
      </div>

      <!-- Execution Metrics -->
      <ExecutionMetrics
        v-if="executionMetrics && executionMetrics.executionId"
        :metrics="executionMetrics"
        class="mt-6"
      />

      <!-- Execution Status Details -->
      <div
        v-if="executionStatus"
        class="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div
          class="p-4 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div class="text-sm text-gray-500 dark:text-slate-400">
            Total Steps
          </div>
          <div class="text-2xl font-semibold text-gray-900 dark:text-slate-200">
            {{ executionStatus.totalSteps }}
          </div>
        </div>
        <div
          class="p-4 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div class="text-sm text-gray-500 dark:text-slate-400">Completed</div>
          <div
            class="text-2xl font-semibold text-green-600 dark:text-green-400"
          >
            {{ executionStatus.completedSteps }}
          </div>
        </div>
        <div
          class="p-4 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div class="text-sm text-gray-500 dark:text-slate-400">
            In Progress
          </div>
          <div class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {{ executionStatus.inProgressSteps }}
          </div>
        </div>
        <div
          class="p-4 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div class="text-sm text-gray-500 dark:text-slate-400">Pending</div>
          <div class="text-2xl font-semibold text-gray-600 dark:text-slate-400">
            {{ executionStatus.pendingSteps + executionStatus.blockedSteps }}
          </div>
        </div>
        <div
          class="p-4 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div class="text-sm text-gray-500 dark:text-slate-400">Failed</div>
          <div class="text-2xl font-semibold text-red-600 dark:text-red-400">
            {{ executionStatus.failedSteps }}
          </div>
        </div>
      </div>

      <!-- No Steps Message -->
      <div
        v-if="!stepExecutions || stepExecutions.length === 0"
        class="mt-8 p-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-center"
      >
        <i
          class="pi pi-info-circle text-4xl text-gray-300 dark:text-slate-600"
        ></i>
        <p class="mt-4 text-gray-500 dark:text-slate-400">
          No step executions found for this workflow execution
        </p>
        <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
          Step executions should be created automatically by the API when the
          workflow starts.
        </p>
        <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">
          Execution ID: {{ execution.id }}
        </p>
        <SecondaryButton @click="loadExecution" class="mt-4">
          <i class="pi pi-refresh mr-2"></i>
          Refresh
        </SecondaryButton>
      </div>

      <!-- DAG Visualization -->
      <ExecutionDAGView
        v-else-if="stepExecutions && stepExecutions.length > 0"
        :steps="stepExecutions"
        class="mt-8"
        @step-click="handleStepClick"
      />

      <!-- Step Executions List -->
      <StepExecutionList
        v-if="stepExecutions && stepExecutions.length > 0"
        :steps="stepExecutions"
        :execution-status="execution.status"
        class="mt-8"
        @step-click="handleStepClick"
        @refresh="loadExecution"
      />
    </template>

    <!-- Step Execution Panel -->
    <StepExecutionPanel
      :step="selectedStep"
      v-model:visible="showStepPanel"
      @step-updated="loadExecution"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useWorkflowExecutions,
  useStepExecutions,
} from '@/composables/workflows';
import type { WorkflowExecutionStatus, StepExecution } from '@/types/workflows';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Badge from '@/volt/Badge.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import ExecutionMetrics from './partials/ExecutionMetrics.vue';
import ExecutionDAGView from './partials/ExecutionDAGView.vue';
import StepExecutionList from './partials/StepExecutionList.vue';
import StepExecutionPanel from './partials/StepExecutionPanel.vue';

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

function getStatusSeverity(
  status: WorkflowExecutionStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    WorkflowExecutionStatus,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    pending: 'secondary',
    in_progress: 'info',
    completed: 'success',
    failed: 'danger',
    cancelled: 'warn',
  };
  return severities[status] || 'secondary';
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

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

function goBack() {
  // Try to go back in history
  if (window.history.length > 1) {
    router.back();
  } else {
    // Fallback to instances list
    router.push({ name: 'workflow-instances:index' });
  }
}

function handleStepClick(step: StepExecution) {
  selectedStep.value = step;
  showStepPanel.value = true;
}

async function handleCancel() {
  if (!execution.value) return;

  const reason = prompt('Please provide a reason for cancellation:');
  if (!reason) return;

  await cancelExecution(execution.value.id, reason, () => {
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
</script>
