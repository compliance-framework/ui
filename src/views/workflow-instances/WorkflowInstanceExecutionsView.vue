<template>
  <div v-if="store.instance" class="space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
        Execution History
      </h3>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        View past and current workflow executions
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-if="store.executions.length === 0"
      class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg"
    >
      <i class="pi pi-history text-4xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">No executions yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Execute Now" to start your first workflow execution.
      </p>
    </div>

    <!-- Executions Table -->
    <div
      v-else
      class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <table class="table-auto w-full dark:text-slate-300">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr class="border-b border-ccf-300 dark:border-slate-700">
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Started
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Triggered By
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Completed
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="execution in sortedExecutions"
            :key="execution.id"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          >
            <td
              class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
            >
              {{ execution.startedAt ? formatDate(execution.startedAt) : '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <Badge :severity="getStatusSeverity(execution.status)">
                {{ execution.status.replace(/_/g, ' ') }}
              </Badge>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              {{ execution.triggeredBy }}
            </td>
            <td
              class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
            >
              <span v-if="execution.completedAt">
                {{ formatDate(execution.completedAt) }}
              </span>
              <span v-else-if="execution.cancelledAt" class="text-red-500">
                Cancelled: {{ formatDate(execution.cancelledAt) }}
              </span>
              <span v-else class="text-gray-400">{{
                execution.status.replace(/_/g, ' ')
              }}</span>
            </td>
            <td class="px-6 py-4 text-right">
              <RouterLinkButton
                :to="{
                  name: 'workflow-execution-view',
                  params: { id: execution.id },
                }"
              >
                View
              </RouterLinkButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import type { WorkflowExecutionStatus } from '@/types/workflows';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import Badge from '@/volt/Badge.vue';

const store = useWorkflowInstanceStore();

const sortedExecutions = computed(() => {
  return [...store.executions].sort((a, b) => {
    return (
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  });
});

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

function getStatusSeverity(
  status: WorkflowExecutionStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    WorkflowExecutionStatus,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    pending: 'secondary',
    in_progress: 'info',
    overdue: 'danger',
    completed: 'success',
    failed: 'danger',
    cancelled: 'warn',
  };
  return severities[status] || 'secondary';
}
</script>
