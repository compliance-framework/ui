<template>
  <PageHeader>Workflow Instance</PageHeader>

  <!-- Loading State -->
  <template v-if="store.isLoading">
    <PageSubHeader>Loading workflow instance...</PageSubHeader>
    <div class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
    </div>
  </template>

  <!-- Error State -->
  <template v-else-if="store.error">
    <PageSubHeader>Error loading workflow instance</PageSubHeader>
    <Message severity="error" class="mt-4">
      {{ store.error }}
    </Message>
    <div class="mt-4">
      <RouterLinkButton :to="{ name: 'workflow-instances:index' }">
        Back to Instances
      </RouterLinkButton>
    </div>
  </template>

  <!-- Instance Loaded -->
  <template v-else-if="store.instance">
    <PageSubHeader>{{ store.instance.name }}</PageSubHeader>

    <p
      v-if="store.instance.description"
      class="mt-2 text-gray-600 dark:text-slate-400"
    >
      {{ store.instance.description }}
    </p>

    <!-- Status and Actions -->
    <div class="mt-4 flex items-center gap-4">
      <Badge :severity="store.isActive ? 'success' : 'secondary'">
        {{ store.isActive ? 'active' : 'inactive' }}
      </Badge>
      <span class="text-sm text-gray-500 dark:text-slate-400">
        Cadence: {{ formatCadence(store.instance.cadence) }}
      </span>
      <div class="flex-1"></div>
      <SecondaryButton
        v-if="store.isActive"
        @click="handleDeactivate"
        :disabled="isToggling"
      >
        <i v-if="isToggling" class="pi pi-spin pi-spinner mr-2"></i>
        Deactivate
      </SecondaryButton>
      <PrimaryButton v-else @click="handleActivate" :disabled="isToggling">
        <i v-if="isToggling" class="pi pi-spin pi-spinner mr-2"></i>
        Activate
      </PrimaryButton>
      <PrimaryButton @click="handleExecute" :disabled="!store.isActive">
        <i class="pi pi-play mr-2"></i>
        Execute Now
      </PrimaryButton>
    </div>

    <!-- Navigation Tabs -->
    <div
      class="mt-6 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap"
    >
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-instance-overview',
          params: { id: store.instance.id },
        }"
      >
        Overview
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-instance-roles',
          params: { id: store.instance.id },
        }"
      >
        Role Assignments
        <span
          class="ml-1 text-sm text-gray-500 dark:text-slate-400"
          v-if="store.roleAssignments.length > 0"
        >
          ({{ store.roleAssignments.length }})
        </span>
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-instance-executions',
          params: { id: store.instance.id },
        }"
      >
        Executions
        <span
          class="ml-1 text-sm text-gray-500 dark:text-slate-400"
          v-if="store.executions.length > 0"
        >
          ({{ store.executions.length }})
        </span>
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-instance-json',
          params: { id: store.instance.id },
        }"
      >
        JSON
      </RouterLink>
    </div>

    <!-- Child Route Content -->
    <div class="my-4">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
  </template>

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
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useWorkflowExecutions } from '@/composables/workflows';
import type { CadenceType } from '@/types/workflows';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Badge from '@/volt/Badge.vue';
import Message from '@/volt/Message.vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useWorkflowInstanceStore();
const { startExecution } = useWorkflowExecutions();

const isToggling = ref(false);
const showExecuteDialog = ref(false);
const isExecuting = ref(false);

function formatCadence(cadence: CadenceType): string {
  if (cadence.startsWith('cron:')) {
    return `Custom (${cadence.slice(5)})`;
  }
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    on_demand: 'On Demand',
  };
  return labels[cadence] || cadence;
}

async function handleActivate() {
  isToggling.value = true;
  try {
    await store.activate();
    toast.add({
      severity: 'success',
      summary: 'Instance Activated',
      detail: 'Workflow instance has been activated',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Activation Failed',
      detail: error instanceof Error ? error.message : 'Failed to activate',
      life: 3000,
    });
  } finally {
    isToggling.value = false;
  }
}

async function handleDeactivate() {
  isToggling.value = true;
  try {
    await store.deactivate();
    toast.add({
      severity: 'success',
      summary: 'Instance Deactivated',
      detail: 'Workflow instance has been deactivated',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Deactivation Failed',
      detail: error instanceof Error ? error.message : 'Failed to deactivate',
      life: 3000,
    });
  } finally {
    isToggling.value = false;
  }
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
  } catch {
    // Error handled by composable
  } finally {
    isExecuting.value = false;
  }
}

// Load instance when route changes
watch(
  () => route.params.id,
  async (id) => {
    if (id && typeof id === 'string') {
      await store.loadInstance(id);
      if (store.error) {
        router.push({ name: 'workflow-instances:index' });
      }
    }
  },
  { immediate: true },
);

// Clear store when leaving
onUnmounted(() => {
  store.clear();
});
</script>

<style scoped>
.tab-link.router-link-exact-active {
  background: none;
  border-bottom: 2px solid;
}

.dark .tab-link.router-link-exact-active {
  background-color: rgb(15 23 42); /* slate-900 */
}
</style>
