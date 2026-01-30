<template>
  <div
    class="p-6 rounded-lg border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900"
  >
    <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
      Execution Metrics
    </h3>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Total Duration -->
      <div>
        <div class="text-sm text-gray-500 dark:text-slate-400">
          Total Duration
        </div>
        <div class="text-xl font-semibold text-gray-900 dark:text-slate-200">
          {{ formatDuration(metrics.totalDurationMinutes) }}
        </div>
      </div>

      <!-- Average Step Duration -->
      <div>
        <div class="text-sm text-gray-500 dark:text-slate-400">
          Average Step Duration
        </div>
        <div class="text-xl font-semibold text-gray-900 dark:text-slate-200">
          {{ formatDuration(metrics.averageStepDurationMinutes) }}
        </div>
      </div>

      <!-- Total Steps -->
      <div>
        <div class="text-sm text-gray-500 dark:text-slate-400">Total Steps</div>
        <div class="text-xl font-semibold text-gray-900 dark:text-slate-200">
          {{ metrics.stepMetrics?.length || 0 }}
        </div>
      </div>
    </div>

    <!-- Step Metrics Table -->
    <div
      v-if="metrics.stepMetrics && metrics.stepMetrics.length > 0"
      class="mt-6"
    >
      <h4 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
        Step Performance
      </h4>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
          <thead>
            <tr>
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Step Name
              </th>
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Started
              </th>
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Completed
              </th>
              <th
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Duration
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ccf-300 dark:divide-slate-700">
            <tr
              v-for="stepMetric in metrics.stepMetrics"
              :key="stepMetric.stepDefinitionId"
              class="hover:bg-zinc-50 dark:hover:bg-slate-800"
            >
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-slate-200">
                {{ stepMetric.stepName }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                {{
                  stepMetric.startedAt ? formatDate(stepMetric.startedAt) : '-'
                }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                {{
                  stepMetric.completedAt
                    ? formatDate(stepMetric.completedAt)
                    : '-'
                }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                {{ formatDuration(stepMetric.durationMinutes) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WorkflowExecutionMetrics } from '@/types/workflows';

defineProps<{
  metrics: WorkflowExecutionMetrics;
}>();

function formatDuration(minutes?: number): string {
  if (!minutes || minutes === 0) return '-';

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
</script>
