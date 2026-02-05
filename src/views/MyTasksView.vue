<template>
  <div>
    <PageHeader>My Tasks</PageHeader>
    <PageSubHeader
      >View and complete your assigned workflow steps</PageSubHeader
    >

    <div class="max-w-7xl mx-auto">
      <!-- Filters -->
      <PageCard class="mb-6">
        <div class="p-4">
          <div class="flex gap-4 items-end">
            <div class="flex-1">
              <Label for="statusFilter">Status</Label>
              <Select
                id="statusFilter"
                v-model="statusFilter"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                placeholder="All Statuses"
                class="w-full"
              />
            </div>
            <SecondaryButton @click="loadAssignments" :disabled="loading">
              <i class="pi pi-refresh mr-2"></i>
              Refresh
            </SecondaryButton>
          </div>
        </div>
      </PageCard>

      <!-- Loading State -->
      <PageCard v-if="loading && assignments.length === 0" class="mb-6">
        <div class="p-8 text-center">
          <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
          <p class="mt-4 text-gray-600 dark:text-slate-400">
            Loading your tasks...
          </p>
        </div>
      </PageCard>

      <!-- Error State -->
      <Message v-else-if="error" severity="error" class="mb-6">
        {{ error }}
      </Message>

      <!-- Empty State -->
      <PageCard v-else-if="assignments.length === 0" class="mb-6">
        <div class="p-8 text-center">
          <i class="pi pi-check-circle text-6xl text-green-500 mb-4"></i>
          <h3
            class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-2"
          >
            No tasks assigned
          </h3>
          <p class="text-gray-600 dark:text-slate-400">
            You don't have any pending or in-progress tasks at the moment.
          </p>
        </div>
      </PageCard>

      <!-- Tasks List -->
      <PageCard v-else>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-200">
              Assigned Tasks ({{ total }})
            </h3>
          </div>

          <div class="space-y-4">
            <div
              v-for="step in assignments"
              :key="step.id"
              @click="openStepPanel(step)"
              class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4
                      class="text-base font-medium text-gray-900 dark:text-slate-200"
                    >
                      {{ getStepName(step) }}
                    </h4>
                    <Badge :severity="getStepStatusSeverity(step.status)">
                      {{ formatStatus(step.status) }}
                    </Badge>
                  </div>

                  <p
                    v-if="getStepDescription(step)"
                    class="text-sm text-gray-600 dark:text-slate-400 mb-3"
                  >
                    {{ getStepDescription(step) }}
                  </p>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span class="text-gray-500 dark:text-slate-500"
                        >Workflow:</span
                      >
                      <div
                        class="font-medium text-gray-900 dark:text-slate-200"
                      >
                        {{ getWorkflowName(step) }}
                      </div>
                    </div>
                    <div v-if="getWorkflowDueDate(step)">
                      <span class="text-gray-500 dark:text-slate-500"
                        >Due Date:</span
                      >
                      <div class="font-medium" :class="getDueDateClass(step)">
                        {{ formatDate(getWorkflowDueDate(step)) }}
                      </div>
                    </div>
                    <div v-if="step.assignedToType">
                      <span class="text-gray-500 dark:text-slate-500"
                        >Assigned as:</span
                      >
                      <div
                        class="font-medium text-gray-900 dark:text-slate-200 capitalize"
                      >
                        {{ step.assignedToType }}
                      </div>
                    </div>
                    <div v-if="step.startedAt">
                      <span class="text-gray-500 dark:text-slate-500"
                        >Started:</span
                      >
                      <div
                        class="font-medium text-gray-900 dark:text-slate-200"
                      >
                        {{ formatDate(step.startedAt) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="ml-4">
                  <i class="pi pi-chevron-right text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="hasMore || offset > 0"
            class="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-slate-700"
          >
            <SecondaryButton
              @click="previousPage"
              :disabled="offset === 0 || loading"
            >
              <i class="pi pi-chevron-left mr-2"></i>
              Previous
            </SecondaryButton>

            <span class="text-sm text-gray-600 dark:text-slate-400">
              Showing {{ offset + 1 }} - {{ offset + assignments.length }} of
              {{ total }}
            </span>

            <SecondaryButton @click="nextPage" :disabled="!hasMore || loading">
              Next
              <i class="pi pi-chevron-right ml-2"></i>
            </SecondaryButton>
          </div>
        </div>
      </PageCard>
    </div>

    <!-- Step Execution Panel (reused from workflow executions) -->
    <StepExecutionPanel
      :step="selectedStep"
      v-model:visible="showStepPanel"
      @step-updated="handleStepUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useMyAssignments } from '@/composables/workflows/useMyAssignments';
import type { StepExecution } from '@/types/workflows';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import Badge from '@/volt/Badge.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import StepExecutionPanel from '@/views/workflow-executions/partials/StepExecutionPanel.vue';

const { assignments, total, loading, error, fetchMyAssignments } =
  useMyAssignments();

const statusFilter = ref('');
const limit = ref(10);
const offset = ref(0);
const hasMore = ref(false);
const selectedStep = ref<StepExecution | null>(null);
const showStepPanel = ref(false);

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Blocked', value: 'blocked' },
];

async function loadAssignments() {
  try {
    const response = await fetchMyAssignments({
      status: statusFilter.value || undefined,
      limit: limit.value,
      offset: offset.value,
    });
    hasMore.value = response.hasMore;
  } catch (err) {
    console.error('Failed to load assignments:', err);
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
  selectedStep.value = step;
  showStepPanel.value = true;
}

function handleStepUpdated() {
  loadAssignments();
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

function getWorkflowDueDate(step: StepExecution): string | undefined {
  return step.workflowExecution?.dueDate;
}

function getDueDateClass(step: StepExecution): string {
  const dueDate = getWorkflowDueDate(step);
  if (!dueDate) return 'text-gray-900 dark:text-slate-200';

  const due = new Date(dueDate);
  const now = new Date();
  const daysDiff = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff < 0) return 'text-red-600 dark:text-red-400';
  if (daysDiff < 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-900 dark:text-slate-200';
}

function getStepStatusSeverity(
  status: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary'
  > = {
    pending: 'secondary',
    blocked: 'warn',
    in_progress: 'info',
    completed: 'success',
    failed: 'danger',
    skipped: 'secondary',
  };
  return severities[status] || 'secondary';
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase();
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
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

onMounted(() => {
  loadAssignments();
});
</script>
