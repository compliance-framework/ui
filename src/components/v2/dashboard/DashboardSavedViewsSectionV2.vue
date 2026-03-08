<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import type { Dashboard } from '@/stores/filters';
import DashboardSavedViewCardV2 from './DashboardSavedViewCardV2.vue';

const confirm = useConfirm();
const toast = useToast();

const {
  data: dashboards,
  error,
  isLoading,
  execute: refreshDashboards,
} = useDataApi<Dashboard[]>('/api/filters');

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

const deletingDashboardId = ref<string | null>(null);

const hasDashboards = computed(() => (dashboards.value?.length ?? 0) > 0);

const loadErrorMessage = computed(() => {
  if (!error.value) {
    return null;
  }

  if (typeof error.value === 'string') {
    return error.value;
  }

  if (error.value instanceof Error) {
    return error.value.message;
  }

  return 'Unable to load dashboards.';
});

async function reloadDashboards(): Promise<void> {
  await refreshDashboards('/api/filters');
}

function confirmDelete(dashboard: Dashboard): void {
  if (!dashboard.id) {
    return;
  }

  confirm.require({
    header: 'Delete Dashboard',
    message: `Are you sure you want to delete the ${dashboard.name} dashboard?`,
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    rejectProps: {
      label: 'Cancel',
    },
    accept: async () => {
      await deleteDashboard(dashboard);
    },
  });
}

async function deleteDashboard(dashboard: Dashboard): Promise<void> {
  if (!dashboard.id) {
    return;
  }

  deletingDashboardId.value = dashboard.id;

  try {
    await executeDelete(`/api/filters/${dashboard.id}`);
    await reloadDashboards();
    toast.add({
      severity: 'success',
      summary: 'Dashboard Deleted',
      detail: `${dashboard.name} was removed.`,
      life: 3000,
    });
  } catch (deleteError) {
    const detail =
      deleteError instanceof Error
        ? deleteError.message
        : 'Unable to delete this dashboard.';

    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail,
      life: 4000,
    });
  } finally {
    deletingDashboardId.value = null;
  }
}
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1.5">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        DASHBOARDS
      </h2>
      <p class="ui-v2-meta text-[var(--ui-v2-secondary-foreground)]">
        Findings grouped by query
      </p>
    </header>

    <div
      v-if="isLoading"
      class="grid gap-4 md:grid-cols-2"
      aria-label="Loading dashboards"
    >
      <article
        v-for="index in 4"
        :key="index"
        class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
      >
        <div class="h-4 w-2/3 animate-pulse bg-[#9ca0b066]" />
        <div class="h-6 w-24 animate-pulse bg-[#df8e1d15]" />
        <div
          class="flex h-12 items-end gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-[10px] py-2"
        >
          <span
            v-for="bar in 7"
            :key="bar"
            class="h-4 w-[18px] animate-pulse bg-[#9ca0b066]"
          />
        </div>
      </article>
    </div>

    <V2StatePanel
      v-else-if="loadErrorMessage"
      kind="error"
      title="Unable to load dashboards."
      :description="loadErrorMessage"
    >
      <template #actions>
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
          @click="reloadDashboards"
        >
          Retry
        </button>
      </template>
    </V2StatePanel>

    <V2StatePanel
      v-else-if="!hasDashboards"
      kind="empty"
      title="No dashboards available"
      description="Saved dashboards appear once you create one from the Evidence workspace."
    >
      <template #actions>
        <RouterLink
          :to="{ name: 'evidence:index' }"
          class="ui-v2-nav inline-flex items-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
        >
          GO TO EVIDENCE
        </RouterLink>
      </template>
    </V2StatePanel>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <DashboardSavedViewCardV2
        v-for="dashboard in dashboards"
        :key="dashboard.id || dashboard.uuid || dashboard.name"
        :dashboard="dashboard"
        :deleting="dashboard.id === deletingDashboardId"
        @delete="confirmDelete"
      />
    </div>
  </section>
</template>
