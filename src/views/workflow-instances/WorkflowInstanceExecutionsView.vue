<template>
  <div v-if="store.instance" class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Execution History
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          View past and current workflow executions
        </p>
      </div>
      <PrimaryButton @click="handleExecute" :disabled="!store.isActive">
        <i class="pi pi-play mr-2"></i>
        Execute Now
      </PrimaryButton>
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
              {{ formatDate(execution.triggeredAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <Badge :severity="getStatusSeverity(execution.status)">
                {{ execution.status.replace('_', ' ') }}
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
              <span v-else class="text-gray-400">-</span>
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

    <!-- Execute Confirmation Dialog -->
    <Dialog
      header="Execute Workflow"
      :draggable="false"
      v-model:visible="showExecuteDialog"
      modal
      class="w-full max-w-md"
    >
      <div class="space-y-4">
        <p>Are you sure you want to start a new execution of this workflow?</p>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          This will create tasks for all defined steps in the workflow.
        </p>
        <div
          class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
        >
          <SecondaryButton @click="showExecuteDialog = false">
            Cancel
          </SecondaryButton>
          <PrimaryButton @click="confirmExecute" :disabled="isExecuting">
            <i v-if="isExecuting" class="pi pi-spin pi-spinner mr-2"></i>
            Start Execution
          </PrimaryButton>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useWorkflowExecutions } from '@/composables/workflows';
import type { WorkflowExecutionStatus } from '@/types/workflows';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';

const router = useRouter();
const store = useWorkflowInstanceStore();
const { startExecution } = useWorkflowExecutions();

const showExecuteDialog = ref(false);
const isExecuting = ref(false);

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
    completed: 'success',
    failed: 'danger',
    cancelled: 'warn',
  };
  return severities[status] || 'secondary';
}

function handleExecute() {
  showExecuteDialog.value = true;
}

async function confirmExecute() {
  if (!store.instance) return;

  isExecuting.value = true;
  try {
    await startExecution(
      { workflowInstanceId: store.instance.id },
      (execution) => {
        store.addExecutionLocally(execution);
        showExecuteDialog.value = false;
        router.push({
          name: 'workflow-execution-view',
          params: { id: execution.id },
        });
      },
    );
  } catch (error) {
    // Error handled by composable
  } finally {
    isExecuting.value = false;
  }
}
</script>
