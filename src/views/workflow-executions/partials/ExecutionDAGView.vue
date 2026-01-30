<template>
  <div
    class="p-6 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
  >
    <div class="flex justify-between items-center mb-4">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Workflow Progress
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Visual representation of step execution flow
        </p>
      </div>
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-gray-400"></div>
          <span class="text-gray-600 dark:text-slate-400">Pending</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-blue-500"></div>
          <span class="text-gray-600 dark:text-slate-400">In Progress</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span class="text-gray-600 dark:text-slate-400">Completed</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <span class="text-gray-600 dark:text-slate-400">Failed</span>
        </div>
      </div>
    </div>

    <!-- Simple Flow Visualization -->
    <div class="overflow-x-auto pb-4">
      <div class="flex items-center gap-4 min-w-max">
        <div
          v-for="(step, index) in sortedSteps"
          :key="step.id"
          class="flex items-center"
        >
          <!-- Step Node -->
          <div
            class="relative group cursor-pointer"
            @click="handleStepClick(step)"
          >
            <div
              class="w-32 p-4 rounded-lg border-2 transition-all"
              :class="getStepNodeClasses(step)"
            >
              <div
                class="text-xs font-medium truncate"
                :class="getStepTextClasses(step)"
              >
                {{
                  (step.workflowStepDefinition || step.stepDefinition)?.name ||
                  'Unnamed'
                }}
              </div>
              <div class="mt-1 text-xs" :class="getStepTextClasses(step)">
                {{ formatStatus(step.status) }}
              </div>
            </div>

            <!-- Tooltip -->
            <div
              class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
            >
              <div class="font-medium">
                {{ (step.workflowStepDefinition || step.stepDefinition)?.name }}
              </div>
              <div class="text-gray-300 dark:text-slate-400">
                {{ formatStatus(step.status) }}
              </div>
              <div
                v-if="
                  (step.workflowStepDefinition || step.stepDefinition)
                    ?.responsibleRole
                "
                class="text-gray-300 dark:text-slate-400"
              >
                Role:
                {{
                  (step.workflowStepDefinition || step.stepDefinition)
                    .responsibleRole
                }}
              </div>
            </div>
          </div>

          <!-- Arrow -->
          <div v-if="index < sortedSteps.length - 1" class="flex-shrink-0">
            <i
              class="pi pi-arrow-right text-2xl text-gray-400 dark:text-slate-600"
            ></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mt-6">
      <div
        class="flex justify-between text-sm text-gray-600 dark:text-slate-400 mb-2"
      >
        <span>Overall Progress</span>
        <span>{{ completedCount }} / {{ sortedSteps.length }} steps</span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div
          class="bg-green-500 h-2 rounded-full transition-all"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StepExecution, StepExecutionStatus } from '@/types/workflows';

const props = defineProps<{
  steps: StepExecution[];
}>();

const emit = defineEmits<{
  stepClick: [step: StepExecution];
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

const completedCount = computed(() => {
  if (!props.steps || !Array.isArray(props.steps)) return 0;
  return props.steps.filter((s) => s.status === 'completed').length;
});

const progressPercentage = computed(() => {
  if (!props.steps || props.steps.length === 0) return 0;
  return Math.round((completedCount.value / props.steps.length) * 100);
});

function getStepNodeClasses(step: StepExecution) {
  const baseClasses = 'hover:shadow-lg';

  switch (step.status) {
    case 'completed':
      return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20`;
    case 'in_progress':
      return `${baseClasses} border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse`;
    case 'failed':
      return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-900/20`;
    case 'blocked':
      return `${baseClasses} border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20`;
    case 'skipped':
      return `${baseClasses} border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-60`;
    default:
      return `${baseClasses} border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800`;
  }
}

function getStepTextClasses(step: StepExecution) {
  switch (step.status) {
    case 'completed':
      return 'text-green-700 dark:text-green-300';
    case 'in_progress':
      return 'text-blue-700 dark:text-blue-300';
    case 'failed':
      return 'text-red-700 dark:text-red-300';
    case 'blocked':
      return 'text-yellow-700 dark:text-yellow-300';
    default:
      return 'text-gray-700 dark:text-slate-300';
  }
}

function formatStatus(status: StepExecutionStatus): string {
  return status.replace(/_/g, ' ');
}

function handleStepClick(step: StepExecution) {
  emit('stepClick', step);
}
</script>
