<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <PageHeader>Evidence Filters</PageHeader>
      <PageSubHeader>Findings grouped by query</PageSubHeader>
    </div>
    <div>
      <RouterLink
        :to="{ name: 'dashboards.create' }"
        :class="{
          'pointer-events-none': !can(RESOURCES.FILTER, ACTIONS.CREATE),
        }"
        :tabindex="can(RESOURCES.FILTER, ACTIONS.CREATE) ? undefined : -1"
        :aria-disabled="!can(RESOURCES.FILTER, ACTIONS.CREATE)"
      >
        <PrimaryButton
          :disabled="!can(RESOURCES.FILTER, ACTIONS.CREATE)"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.FILTER, ACTIONS.CREATE),
            disabled: can(RESOURCES.FILTER, ACTIONS.CREATE),
          }"
          >Create</PrimaryButton
        >
      </RouterLink>
    </div>
  </div>

  <div
    v-if="dashboards && dashboards.length > 0"
    class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3"
  >
    <div class="flex items-center gap-3">
      <label
        for="scope-filter"
        class="text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        Scope
      </label>
      <Select
        id="scope-filter"
        v-model="selectedScope"
        :options="scopeFilterOptions"
        optionLabel="label"
        optionValue="value"
        class="w-64"
        data-testid="scope-filter"
      />
    </div>
    <div class="flex items-center gap-3">
      <label
        for="control-filter"
        class="text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        Control
      </label>
      <Select
        id="control-filter"
        v-model="selectedControl"
        :options="controlFilterOptions"
        optionLabel="label"
        optionValue="value"
        filter
        class="w-64"
        data-testid="control-filter"
      />
    </div>
    <div class="flex items-center gap-3">
      <label
        for="component-filter"
        class="text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        Component
      </label>
      <Select
        id="component-filter"
        v-model="selectedComponent"
        :options="componentFilterOptions"
        optionLabel="label"
        optionValue="value"
        filter
        class="w-64"
        data-testid="component-filter"
      />
    </div>
  </div>

  <div
    v-if="filteredDashboards.length > 0"
    class="mt-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <table class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
          <th class="w-10 px-4 py-3"></th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Name
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Scope
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Controls
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Components
          </th>
          <th
            class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="dashboard in filteredDashboards"
          :key="dashboardKey(dashboard)"
        >
          <tr
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800 cursor-pointer"
            :data-testid="`filter-row-${dashboardKey(dashboard)}`"
            @click="toggleExpanded(dashboard)"
          >
            <td class="px-4 py-4 text-center">
              <i
                class="pi text-xs text-gray-500 dark:text-slate-400"
                :class="
                  isExpanded(dashboard) ? 'pi-chevron-down' : 'pi-chevron-right'
                "
                :aria-label="isExpanded(dashboard) ? 'Collapse' : 'Expand'"
              ></i>
            </td>
            <td
              class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
            >
              {{ dashboard.name }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              {{ scopeLabel(dashboard) }}
            </td>
            <td class="px-6 py-4 text-sm">
              <template v-if="dashboard.controls && dashboard.controls.length">
                <Chip
                  v-for="control in dashboard.controls"
                  :key="control.id"
                  :label="control.id"
                  class="mx-1"
                  v-tooltip.top="control.title"
                />
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-6 py-4 text-sm">
              <template
                v-if="dashboard.components && dashboard.components.length"
              >
                <Chip
                  v-for="component in dashboard.components"
                  :key="component.uuid"
                  :label="component.title"
                  class="mx-1"
                  v-tooltip.top="component.title"
                />
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-6 py-4 text-right" @click.stop>
              <div class="flex gap-2 justify-end">
                <PrimaryButton
                  size="small"
                  @click="openEdit(dashboard)"
                  :disabled="!can(RESOURCES.FILTER, ACTIONS.UPDATE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.FILTER, ACTIONS.UPDATE),
                    disabled: can(RESOURCES.FILTER, ACTIONS.UPDATE),
                  }"
                >
                  Edit
                </PrimaryButton>
                <SecondaryButton
                  size="small"
                  severity="danger"
                  @click="deleteDashboard(dashboard)"
                  :disabled="!can(RESOURCES.FILTER, ACTIONS.DELETE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.FILTER, ACTIONS.DELETE),
                    disabled: can(RESOURCES.FILTER, ACTIONS.DELETE),
                  }"
                >
                  Delete
                </SecondaryButton>
              </div>
            </td>
          </tr>
          <tr
            v-if="isExpanded(dashboard)"
            :data-testid="`filter-chart-${dashboardKey(dashboard)}`"
            class="border-b border-ccf-300 dark:border-slate-800 bg-zinc-50 dark:bg-slate-800/50"
          >
            <td colspan="6" class="px-6 py-4">
              <div class="h-64">
                <DashboardChart
                  :filter="dashboard.filter"
                  :dashboard="dashboard"
                />
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <Message
    v-else-if="dashboards && dashboards.length > 0"
    severity="warn"
    variant="outlined"
    class="mt-4"
  >
    <h4 class="font-bold">No Filters Match These Filters</h4>
    <p>
      Try a different scope, control, or component, or reset them all to "All"
      to see every filter.
    </p>
  </Message>

  <Message v-else severity="warn" variant="outlined" class="mt-6">
    <h4 class="font-bold">No Filters Found</h4>
    <p>
      Filters can be created on the
      <RouterLink :to="{ name: 'evidence:index' }" class="underline">
        evidence
      </RouterLink>
      page
    </p>
  </Message>

  <FilterEditModal
    v-model:visible="showEditModal"
    :dashboard="editingDashboard"
    @saved="refreshDashboards()"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { Dashboard } from '@/stores/filters.ts';
import type { SystemSecurityPlan } from '@/oscal';
import DashboardChart from '@/views/dashboard/DashboardChart.vue';
import FilterEditModal from '@/views/dashboard/partials/FilterEditModal.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Chip from '@/volt/Chip.vue';
import Message from '@/volt/Message.vue';
import Select from '@/volt/Select.vue';
import { useDataApi } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const confirm = useConfirm();
const toast = useToast();

const { data: dashboards, execute: refreshDashboards } =
  useDataApi<Dashboard[]>('/api/filters');
const { data: systemSecurityPlans } = useDataApi<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

const sspTitleById = computed(
  () =>
    new Map(
      (systemSecurityPlans.value ?? []).map((ssp) => [
        ssp.uuid,
        ssp.metadata.title,
      ]),
    ),
);

// 'all' shows every filter regardless of scope; null matches only unscoped (Global)
// filters; any other value matches filters scoped to that SSP.
const selectedScope = ref<string | null>('all');

const scopeFilterOptions = computed(() => [
  { label: 'All Scopes', value: 'all' },
  { label: 'Global', value: null },
  ...(systemSecurityPlans.value ?? []).map((ssp) => ({
    label: ssp.metadata.title,
    value: ssp.uuid,
  })),
]);

// 'all' shows filters with any (or no) controls/components; any other value matches
// filters that include that specific control/component.
const selectedControl = ref<string>('all');
const selectedComponent = ref<string>('all');

const controlFilterOptions = computed(() => {
  const controlsById = new Map<string, string>();
  for (const dashboard of dashboards.value ?? []) {
    for (const control of dashboard.controls ?? []) {
      controlsById.set(control.id, control.title ?? control.id);
    }
  }
  return [
    { label: 'All Controls', value: 'all' },
    ...Array.from(controlsById, ([id, title]) => ({
      label: `${id} — ${title}`,
      value: id,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
});

const componentFilterOptions = computed(() => {
  const componentsByUuid = new Map<string, string>();
  for (const dashboard of dashboards.value ?? []) {
    for (const component of dashboard.components ?? []) {
      componentsByUuid.set(component.uuid, component.title ?? component.uuid);
    }
  }
  return [
    { label: 'All Components', value: 'all' },
    ...Array.from(componentsByUuid, ([uuid, title]) => ({
      label: title,
      value: uuid,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
});

const filteredDashboards = computed(() => {
  return (dashboards.value ?? [])
    .filter((dashboard) => {
      if (selectedScope.value === 'all') {
        return true;
      }
      if (selectedScope.value === null) {
        return !dashboard.sspId;
      }
      return dashboard.sspId === selectedScope.value;
    })
    .filter(
      (dashboard) =>
        selectedControl.value === 'all' ||
        (dashboard.controls ?? []).some(
          (control) => control.id === selectedControl.value,
        ),
    )
    .filter(
      (dashboard) =>
        selectedComponent.value === 'all' ||
        (dashboard.components ?? []).some(
          (component) => component.uuid === selectedComponent.value,
        ),
    );
});

function dashboardKey(dashboard: Dashboard): string {
  return dashboard.id ?? dashboard.uuid ?? dashboard.name;
}

function scopeLabel(dashboard: Dashboard): string {
  if (!dashboard.sspId) {
    return 'Global';
  }
  return sspTitleById.value.get(dashboard.sspId) ?? `SSP ${dashboard.sspId}`;
}

const expandedKeys = ref<Set<string>>(new Set());

function isExpanded(dashboard: Dashboard): boolean {
  return expandedKeys.value.has(dashboardKey(dashboard));
}

function toggleExpanded(dashboard: Dashboard) {
  const key = dashboardKey(dashboard);
  const next = new Set(expandedKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedKeys.value = next;
}

const showEditModal = ref(false);
const editingDashboard = ref<Dashboard | null>(null);

function openEdit(dashboard: Dashboard) {
  editingDashboard.value = dashboard;
  showEditModal.value = true;
}

function deleteDashboard(dashboard: Dashboard) {
  confirm.require({
    message: `Are you sure you want to delete the ${dashboard.name} filter ?`,
    header: 'Delete Filter',
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
        detail: 'Filter deletion cancelled',
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
