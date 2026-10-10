<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import type { Dashboard } from '@/stores/filters';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
// Main's edit dialog: it keeps the filter's SSP binding and controls on PUT.
import FilterEditModal from '@/views/dashboard/partials/FilterEditModal.vue';
import DashboardSavedViewCardV2 from './DashboardSavedViewCardV2.vue';

const confirm = useConfirm();
const toast = useToast();
const { can, permissionTooltip } = usePermissions();

const canCreate = computed(() => can(RESOURCES.FILTER, ACTIONS.CREATE));
const canEdit = computed(() => can(RESOURCES.FILTER, ACTIONS.UPDATE));
const canDelete = computed(() => can(RESOURCES.FILTER, ACTIONS.DELETE));

const showEditModal = ref(false);
const editingDashboard = ref<Dashboard | null>(null);

function openEdit(dashboard: Dashboard): void {
  editingDashboard.value = dashboard;
  showEditModal.value = true;
}

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

  return 'Unable to load evidence filters.';
});

async function reloadDashboards(): Promise<void> {
  await refreshDashboards('/api/filters');
}

function confirmDelete(dashboard: Dashboard): void {
  if (!dashboard.id) {
    return;
  }

  confirm.require({
    header: 'Delete Evidence Filter',
    message: `Are you sure you want to delete the ${dashboard.name} evidence filter?`,
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
      summary: 'Evidence Filter Deleted',
      detail: `${dashboard.name} was removed.`,
      life: 3000,
    });
  } catch (deleteError) {
    const detail =
      deleteError instanceof Error
        ? deleteError.message
        : 'Unable to delete this evidence filter.';

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
    <header class="flex items-start justify-between gap-4">
      <div class="space-y-1.5">
        <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
          EVIDENCE FILTERS
        </h2>
        <p class="ui-v2-meta text-[var(--ui-v2-secondary-foreground)]">
          Findings grouped by query
        </p>
      </div>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'dashboards.create' }"
        class="ui-v2-nav inline-flex items-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
      >
        CREATE
      </RouterLink>
      <span
        v-else
        v-tooltip.top="permissionTooltip(RESOURCES.FILTER, ACTIONS.CREATE)"
        class="ui-v2-nav inline-flex cursor-not-allowed items-center border border-[var(--ui-v2-border)] px-4 py-2 font-semibold text-[var(--ui-v2-muted-foreground)] opacity-60"
        aria-disabled="true"
      >
        CREATE
      </span>
    </header>

    <div
      v-if="isLoading"
      class="grid gap-4 md:grid-cols-2"
      aria-label="Loading evidence filters"
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
      title="Unable to load evidence filters."
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
      title="No evidence filters available"
      description="Create an evidence filter here, or save a query from the Evidence workspace."
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
        :can-edit="canEdit"
        :can-delete="canDelete"
        :edit-tooltip="permissionTooltip(RESOURCES.FILTER, ACTIONS.UPDATE)"
        :delete-tooltip="permissionTooltip(RESOURCES.FILTER, ACTIONS.DELETE)"
        @edit="openEdit"
        @delete="confirmDelete"
      />
    </div>

    <FilterEditModal
      v-model:visible="showEditModal"
      :dashboard="editingDashboard"
      @saved="reloadDashboards"
    />
  </section>
</template>
