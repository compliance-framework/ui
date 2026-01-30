<template>
  <div
    class="rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
  >
    <div class="p-6 border-b border-ccf-300 dark:border-slate-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
        Step Executions
      </h3>
      <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
        Track progress and complete steps in this workflow execution
      </p>
    </div>

    <div class="divide-y divide-ccf-300 dark:divide-slate-700">
      <div
        v-for="step in sortedSteps"
        :key="step.id"
        class="p-6 hover:bg-zinc-50 dark:hover:bg-slate-800 cursor-pointer"
        @click="handleStepClick(step)"
      >
        <div class="flex items-start justify-between">
          <!-- Step Info -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <Badge :severity="getStepStatusSeverity(step.status)">
                {{ formatStatus(step.status) }}
              </Badge>
              <h4
                class="text-base font-medium text-gray-900 dark:text-slate-200"
              >
                {{
                  (step.workflowStepDefinition || step.stepDefinition)?.name ||
                  'Unnamed Step'
                }}
              </h4>
            </div>
            <p
              v-if="
                (step.workflowStepDefinition || step.stepDefinition)
                  ?.description
              "
              class="mt-2 text-sm text-gray-600 dark:text-slate-400"
            >
              {{
                (step.workflowStepDefinition || step.stepDefinition).description
              }}
            </p>
            <div
              class="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400"
            >
              <span
                v-if="
                  (step.workflowStepDefinition || step.stepDefinition)
                    ?.responsibleRole
                "
              >
                <i class="pi pi-user mr-1"></i>
                {{
                  (step.workflowStepDefinition || step.stepDefinition)
                    .responsibleRole
                }}
              </span>
              <span v-if="step.startedAt">
                <i class="pi pi-clock mr-1"></i>
                Started: {{ formatDate(step.startedAt) }}
              </span>
              <span v-if="step.completedAt">
                <i class="pi pi-check mr-1"></i>
                Completed: {{ formatDate(step.completedAt) }}
              </span>
              <span v-if="step.failedAt" class="text-red-600 dark:text-red-400">
                <i class="pi pi-times mr-1"></i>
                Failed: {{ formatDate(step.failedAt) }}
              </span>
            </div>
            <div
              v-if="step.failureReason"
              class="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200"
            >
              <strong>Failure Reason:</strong> {{ step.failureReason }}
            </div>
            <div
              v-if="step.completionNotes"
              class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200"
            >
              <strong>Notes:</strong> {{ step.completionNotes }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2 ml-4">
            <PrimaryButton size="small" @click.stop="handleStepClick(step)">
              <i class="pi pi-eye mr-1"></i>
              View Details
            </PrimaryButton>
          </div>
        </div>

        <!-- Evidence -->
        <div v-if="step.evidence && step.evidence.length > 0" class="mt-4">
          <h5
            class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Evidence Submitted ({{ step.evidence.length }})
          </h5>
          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="evidence in step.evidence"
              :key="evidence.id"
              severity="info"
            >
              <i class="pi pi-file mr-1"></i>
              {{ evidence.evidenceType }}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  StepExecution,
  StepExecutionStatus,
  WorkflowExecutionStatus,
} from '@/types/workflows';
import Badge from '@/volt/Badge.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';

const props = defineProps<{
  steps: StepExecution[];
  executionStatus: WorkflowExecutionStatus;
}>();

const emit = defineEmits<{
  stepClick: [step: StepExecution];
  refresh: [];
}>();

const sortedSteps = computed(() => {
  if (!props.steps || !Array.isArray(props.steps)) return [];
  return [...props.steps].sort((a, b) => {
    const defA = a.workflowStepDefinition || a.stepDefinition;
    const defB = b.workflowStepDefinition || b.stepDefinition;
    const orderA = defA?.order ?? 0;
    const orderB = defB?.order ?? 0;
    return orderA - orderB;
  });
});

function getStepStatusSeverity(
  status: StepExecutionStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    StepExecutionStatus,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    pending: 'secondary',
    blocked: 'warn',
    in_progress: 'info',
    completed: 'success',
    failed: 'danger',
    skipped: 'contrast',
  };
  return severities[status] || 'secondary';
}

function formatStatus(status: StepExecutionStatus): string {
  return status.replace(/_/g, ' ').toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function handleStepClick(step: StepExecution) {
  emit('stepClick', step);
}
</script>
