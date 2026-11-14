<script setup lang="ts">
/**
 * A workflow instance (/workflow-instances/:id/...): its status, cadence, Activate/Deactivate and
 * Run now, and its sections as route tabs (overview, roles, runs, JSON). The classic page's logic
 * is kept.
 */
import { computed as dsComputed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { ref, watch, onUnmounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useWorkflowExecutions } from '@/composables/workflows';
import type { CadenceType } from '@/types/workflows';
import { useToast } from 'primevue/usetoast';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useWorkflowInstanceStore();
const { startExecution } = useWorkflowExecutions();

const isToggling = ref(false);
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

async function handleExecute() {
  if (!store.instance) return;

  isExecuting.value = true;
  try {
    await startExecution(
      { workflowInstanceId: store.instance.id },
      (execution) => {
        store.addExecutionLocally(execution);
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
    }
  },
  { immediate: true },
);

// Clear store when leaving
onUnmounted(() => {
  store.clear();
});

const updateDenied = dsComputed(() =>
  can(RESOURCES.WORKFLOW_INSTANCE, ACTIONS.UPDATE)
    ? undefined
    : permissionTooltip(RESOURCES.WORKFLOW_INSTANCE, ACTIONS.UPDATE),
);
const runDenied = dsComputed(() => {
  if (!store.isActive) return 'Only an active instance can run.';
  return can(RESOURCES.WORKFLOW_EXECUTION, ACTIONS.CREATE)
    ? undefined
    : permissionTooltip(RESOURCES.WORKFLOW_EXECUTION, ACTIONS.CREATE);
});
const tabs = dsComputed(() => {
  const id = store.instance?.id;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'workflow-instance-overview', params: { id } },
    },
    {
      label: 'Role assignments',
      to: { name: 'workflow-instance-roles', params: { id } },
      count: store.roleAssignments.length || undefined,
    },
    {
      label: 'Runs',
      to: { name: 'workflow-instance-executions', params: { id } },
      count: store.executions.length || undefined,
    },
    { label: 'JSON', to: { name: 'workflow-instance-json', params: { id } } },
  ];
});
</script>

<template>
  <DataState
    v-if="!store.instance"
    :status="store.error ? 'error' : 'loading'"
    subject="this workflow instance"
    :error-message="store.error ? String(store.error) : undefined"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="store.instance.name"
    :description="store.instance.description"
    :tabs="tabs"
  >
    <template #status>
      <Tag :label="store.isActive ? 'Active' : 'Inactive'" />
      <Text as="span" variant="caption"
        >Runs {{ formatCadence(store.instance.cadence) }}</Text
      >
    </template>
    <template #actions>
      <Button
        v-if="store.isActive"
        :loading="isToggling"
        :disabled-reason="updateDenied"
        @click="handleDeactivate"
        >Deactivate</Button
      >
      <Button
        v-else
        :loading="isToggling"
        :disabled-reason="updateDenied"
        @click="handleActivate"
        >Activate</Button
      >
      <Button
        variant="primary"
        icon="next"
        :loading="isExecuting"
        :disabled-reason="runDenied"
        @click="handleExecute"
        >Run now</Button
      >
    </template>
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </RecordTemplate>
</template>
