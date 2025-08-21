<template>
  <div v-if="dashboards && dashboards.length > 0">
    <PageHeader>Dashboards</PageHeader>
    <PageSubHeader>Findings grouped by query</PageSubHeader>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
      <PageCard v-for="dashboard in dashboards" :key="dashboard.uuid">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
            {{ dashboard.name }}
          </h3>
          <div>
            <Chip
              v-for="control in dashboard.controls"
              :key="control.id"
              :label="control.id"
              class="mx-1"
              v-tooltip.top="control.title"
            />
          </div>
        </div>
        <div class="h-32">
          <DashboardChart :filter="dashboard.filter" :dashboard="dashboard" />
        </div>
        <Button
          label="Delete Dashboard"
          @click.prevent="deleteDashboard(dashboard)"
          class="bg-red-500 border-red-600 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:border-red-700 mr-4"
        >
          Delete
        </Button>
      </PageCard>
    </div>
  </div>

  <Message v-else severity="warn" variant="outlined">
    <h4 class="font-bold">No Dashboards Found</h4>
    <p>
      Dashboards can be created on the
      <RouterLink :to="{ name: 'evidence:index' }" class="underline"
        >evidence
      </RouterLink>
      page
    </p>
  </Message>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { Dashboard } from '@/stores/filters.ts';
import DashboardChart from '@/views/dashboard/DashboardChart.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Button from '@/volt/Button.vue';
import Chip from '@/volt/Chip.vue';
import Message from '@/volt/Message.vue';
import { useDataApi } from '@/composables/axios';

const confirm = useConfirm();
const toast = useToast();

const { data: dashboards, execute: refreshDashboards } =
  useDataApi<Dashboard[]>('/api/filters');

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

function deleteDashboard(dashboard: Dashboard) {
  confirm.require({
    message: `Are you sure you want to delete the ${dashboard.name} dashboard ?`,
    header: 'Delete Dashboard',
    rejectProps: {
      label: 'Cancel',
    },
    acceptProps: {
      label: 'Yes',
      severity: 'danger',
    },
    accept: async () => {
      await sendDeleteDashboard(dashboard);
    },
    reject: () => {
      toast.add({
        severity: 'info',
        summary: 'Cancelled',
        detail: 'Subject deletion cancelled',
        life: 3000,
      });
    },
  });
}

async function sendDeleteDashboard(dashboard: Dashboard) {
  await executeDelete(`/api/filters/${dashboard.id}`);
  await refreshDashboards();
}
</script>
