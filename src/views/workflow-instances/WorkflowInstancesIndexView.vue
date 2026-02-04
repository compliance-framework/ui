<template>
  <div v-if="!hasSSP" class="space-y-3">
    <Message severity="error" variant="outlined">
      <div class="space-y-2 text-gray-700 dark:text-slate-200">
        <h4 class="text-base font-semibold">
          System Security Plan not selected
        </h4>
        <p>
          You have not selected a system security plan for managing instances.
        </p>
        <p>Please choose an SSP before creating workflow instances.</p>
      </div>
    </Message>
  </div>
  <div v-else>
    <div class="flex justify-between items-center mb-6">
      <div>
        <PageHeader>Workflow Instances</PageHeader>
        <PageSubHeader>
          Manage workflow instances for your systems
        </PageSubHeader>
      </div>
      <PrimaryButton @click="toggleCreating">
        <i class="pi pi-plus mr-2"></i>
        New Instance
      </PrimaryButton>
    </div>
    <!-- Filters -->
    <div class="mb-4 flex gap-4 items-center flex-wrap">
      <div class="flex-1 min-w-48">
        <Select
          v-model="definitionFilter"
          :options="definitionOptions"
          optionLabel="name"
          optionValue="id"
          placeholder="Filter by definition"
          class="w-full"
          showClear
          @change="loadInstances"
        />
      </div>
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Filter by status"
        class="w-48"
        showClear
        @change="loadInstances"
      />
    </div>

    <!-- Loading State -->
    <div v-if="!instancesLoaded" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">
        Loading workflow instances...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!instances || instances.length === 0"
      class="text-center py-12"
    >
      <i class="pi pi-inbox text-6xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">
        No workflow instances found.
      </p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "New Instance" to create a workflow instance for your system.
      </p>
    </div>

    <!-- Instances Table -->
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
              Name
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Definition
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Cadence
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Last Execution
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
            v-for="instance in instances"
            :key="instance.id"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          >
            <td class="px-6 py-4">
              <div
                class="text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {{ instance.name }}
              </div>
              <div
                v-if="instance.description"
                class="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs"
              >
                {{ instance.description }}
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              <RouterLink
                v-if="instance.workflowDefinition"
                :to="{
                  name: 'workflow-definition-editor',
                  params: { id: instance.workflowDefinitionId },
                }"
                class="hover:underline text-blue-600 dark:text-blue-400"
              >
                {{ instance.workflowDefinition.name }}
              </RouterLink>
              <span v-else>{{ instance.workflowDefinitionId }}</span>
            </td>
            <td
              class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
            >
              <span class="capitalize">
                {{ formatCadence(instance.cadence) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <Badge
                :severity="
                  instance.status === 'active' ? 'success' : 'secondary'
                "
              >
                {{ instance.status }}
              </Badge>
            </td>
            <td
              class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
            >
              <span v-if="instance.lastExecutionAt">
                {{ formatDate(instance.lastExecutionAt) }}
              </span>
              <span v-else class="text-gray-400">Never</span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex gap-2 justify-end">
                <PrimaryButton
                  size="small"
                  @click="handleExecute(instance)"
                  :disabled="instance.status !== 'active'"
                  title="Execute workflow"
                >
                  Execute
                </PrimaryButton>
                <RouterLinkButton
                  :to="{
                    name: 'workflow-instance-editor',
                    params: { id: instance.id },
                  }"
                >
                  View
                </RouterLinkButton>
                <SecondaryButton
                  size="small"
                  severity="danger"
                  @click="handleDelete(instance)"
                >
                  Delete
                </SecondaryButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Create Dialog -->
    <Dialog
      header="Create Workflow Instance"
      :draggable="false"
      v-model:visible="creating"
      modal
      class="w-full max-w-2xl"
    >
      <WorkflowInstanceCreateForm
        v-if="sspId"
        :preselectedSystemId="sspId"
        :preselectedDefinitionId="definitionFilter || undefined"
        @created="instanceCreated"
        @cancel="setCreating(false)"
      />
    </Dialog>
    <!-- Execute Confirmation Dialog -->
    <Dialog
      header="Execute Workflow"
      :draggable="false"
      v-model:visible="showExecuteDialog"
      modal
      class="w-full max-w-md"
    >
      <div class="space-y-4">
        <p>
          Are you sure you want to start a new execution of
          <strong>{{ executingInstance?.name }}</strong
          >?
        </p>
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
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  useWorkflowInstances,
  useWorkflowDefinitions,
  useWorkflowExecutions,
} from '@/composables/workflows';
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
  CadenceType,
} from '@/types/workflows';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import Select from '@/volt/Select.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import WorkflowInstanceCreateForm from './partials/WorkflowInstanceCreateForm.vue';
import { useToggle } from '@/composables/useToggle';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system';

const router = useRouter();
const toast = useToast();

const { instances, instancesLoaded, listInstances, deleteInstance } =
  useWorkflowInstances();

const { definitions: definitionOptions, listDefinitions } =
  useWorkflowDefinitions();

const { startExecution } = useWorkflowExecutions();

const {
  value: creating,
  toggle: toggleCreating,
  set: setCreating,
} = useToggle(false);

const systemStore = useSystemStore();
const sspId = computed(() => systemStore.system?.securityPlan?.uuid || '');
const hasSSP = computed(() => !!sspId.value);

const definitionFilter = ref<string | null>(null);
const statusFilter = ref<WorkflowInstanceStatus | null>(null);

const showExecuteDialog = ref(false);
const executingInstance = ref<WorkflowInstance | null>(null);
const isExecuting = ref(false);

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function formatCadence(cadence: CadenceType): string {
  const labels: Record<CadenceType, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    on_demand: 'On Demand',
  };
  return labels[cadence] || cadence;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

async function loadInstances() {
  if (!sspId.value) return;

  await listInstances({
    workflowDefinitionId: definitionFilter.value || undefined,
    status: statusFilter.value || undefined,
    systemId: sspId.value,
  });
}

watch(sspId, async (value) => {
  if (value) {
    await Promise.all([loadInstances(), listDefinitions()]);
  }
});

async function handleDelete(instance: WorkflowInstance) {
  await deleteInstance(instance.id, instance.name, () => {
    if (instances.value) {
      const idx = instances.value.findIndex((i) => i.id === instance.id);
      if (idx >= 0) {
        instances.value.splice(idx, 1);
      }
    }
  });
}

function handleExecute(instance: WorkflowInstance) {
  executingInstance.value = instance;
  showExecuteDialog.value = true;
}

async function confirmExecute() {
  if (!executingInstance.value) return;

  isExecuting.value = true;
  try {
    await startExecution(
      { workflowInstanceId: executingInstance.value.id },
      (exec) => {
        toast.add({
          severity: 'success',
          summary: 'Execution Started',
          detail: 'Workflow execution has been started',
          life: 3000,
        });
        // Navigate to execution view
        router.push({
          name: 'workflow-execution-view',
          params: { id: exec.id },
        });
      },
    );
    showExecuteDialog.value = false;
  } catch {
    // Error handled by composable
  } finally {
    isExecuting.value = false;
  }
}

function instanceCreated(instance: WorkflowInstance) {
  setCreating(false);
  router.push({
    name: 'workflow-instance-editor',
    params: { id: instance.id },
  });
}

onMounted(async () => {
  if (sspId.value) {
    await Promise.all([loadInstances(), listDefinitions()]);
  }
});
</script>
