<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <TooltipTitle
        text="System Components"
        tooltip-key="system.components"
        underline-class="text-lg font-semibold dark:text-slate-300 underline decoration-dotted cursor-help"
      />
      <PrimaryButton
        @click="showCreateComponentModal = true"
        :disabled="!can(RESOURCES.SSP, ACTIONS.CREATE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.SSP, ACTIONS.CREATE),
          disabled: can(RESOURCES.SSP, ACTIONS.CREATE),
        }"
      >
        <i class="pi pi-plus mr-2"></i>
        Create Component
      </PrimaryButton>
    </div>

    <div class="space-y-4">
      <div
        v-if="!components?.length"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No components defined. Create your first component to get started.
      </div>

      <Panel
        v-for="component in components"
        :key="component.uuid"
        toggleable
        :collapsed="componentPanelCollapsed(component.uuid)"
        @update:collapsed="setComponentPanelCollapsed(component.uuid, $event)"
      >
        <template #header>
          <div class="flex items-center gap-2 py-2">
            <span class="font-medium">{{ component.title }}</span>
            <span
              class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
            >
              {{ component.type }}
            </span>
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              :class="{
                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200':
                  component.status?.state === 'operational',
                'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200':
                  component.status?.state !== 'operational',
              }"
            >
              {{ component.status?.state || 'unknown' }}
            </span>
            <span
              v-if="openComponentRiskCount(component) > 0"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200"
            >
              {{ openComponentRiskLabel(component) }}
            </span>
          </div>
        </template>
        <div class="py-3 px-4 flex justify-end items-center">
          <div class="flex gap-2">
            <TertiaryButton @click.stop="openDashboardDrawer(component)">
              Dashboards
            </TertiaryButton>
            <TertiaryButton
              @click.stop="editComponent(component)"
              :disabled="!can(RESOURCES.SSP, ACTIONS.UPDATE)"
              v-tooltip.top="{
                value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
                disabled: can(RESOURCES.SSP, ACTIONS.UPDATE),
              }"
            >
              Edit
            </TertiaryButton>
            <TertiaryButton @click.stop="downloadComponentJSON(component)">
              JSON
            </TertiaryButton>
            <TertiaryButton
              :disabled="!can(RESOURCES.SSP, ACTIONS.DELETE)"
              v-tooltip.top="{
                value: permissionTooltip(RESOURCES.SSP, ACTIONS.DELETE),
                disabled: can(RESOURCES.SSP, ACTIONS.DELETE),
              }"
              @click.stop="
                confirmDeleteDialog(() => deleteComponent(component), {
                  itemName: component.title,
                  itemType: 'component',
                })
              "
              class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Delete
            </TertiaryButton>
          </div>
        </div>
        <div
          class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
        >
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
            {{ component.description }}
          </p>

          <div v-if="component.purpose" class="mb-3">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >Purpose:</span
            >
            <span class="text-sm text-gray-600 dark:text-slate-400 ml-2">{{
              component.purpose
            }}</span>
          </div>

          <div v-if="component.protocols?.length" class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >Protocols:</span
            >
            <div
              v-for="protocol in component.protocols"
              :key="protocol.uuid"
              class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
            >
              <div class="font-medium text-sm">
                {{ protocol.title }}
              </div>
              <div class="text-xs text-gray-600 dark:text-slate-400 mt-1">
                {{ protocol.name }}
              </div>
              <div
                v-if="protocol.portRanges?.length"
                class="text-xs text-blue-600 dark:text-blue-400 mt-1"
              >
                <span
                  v-for="range in protocol.portRanges"
                  :key="range.transport"
                  class="mr-3"
                >
                  {{ range.transport }}: {{ range.start }}-{{ range.end }}
                </span>
              </div>
            </div>
          </div>

          <ComponentRisksList
            v-if="!componentPanelCollapsed(component.uuid)"
            :ssp-id="sspId"
            :component="component"
            :risks="risks || []"
            :users="users || []"
            :loading-risks="loadingRisks"
            @risks-updated="refreshRisksAndUsers"
          />
        </div>
      </Panel>
    </div>

    <!-- Component Dashboard Drawer -->
    <Drawer
      v-model:visible="dashboardDrawerOpen"
      header="Dashboards"
      position="right"
      class="w-full! md:w-1/2! lg:w-3/5!"
    >
      <ComponentDashboardsView
        v-if="selectedComponent"
        :ssp-id="sspId"
        :component="selectedComponent"
      />
    </Drawer>

    <!-- Component Create Modal -->
    <Dialog
      v-model:visible="showCreateComponentModal"
      modal
      header="Create System Component"
      :draggable="false"
      class="w-full max-w-2xl"
    >
      <SystemImplementationComponentCreateForm
        :ssp-id="sspId"
        @cancel="showCreateComponentModal = false"
        @created="handleComponentCreated"
      />
    </Dialog>

    <!-- Component Edit Modal -->
    <Dialog
      v-model:visible="showEditComponentModal"
      modal
      header="Edit System Component"
      :draggable="false"
      class="w-full max-w-2xl"
    >
      <SystemImplementationComponentEditForm
        v-if="editingComponent"
        :ssp-id="sspId"
        :component="editingComponent!"
        @cancel="showEditComponentModal = false"
        @saved="handleComponentSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import TooltipTitle from '@/components/TooltipTitle.vue';
import { computed, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { downloadJson } from '@/utils/download-json';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import Drawer from '@/volt/Drawer.vue';
import Panel from '@/volt/Panel.vue';

import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';
import ComponentDashboardsView from '@/views/system/partials/ComponentDashboardsView.vue';
import ComponentRisksList from '@/views/system/partials/ComponentRisksList.vue';

import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { Risk, SystemComponent, SystemUser } from '@/oscal';
import {
  getRiskComponentIds,
  normalizeRiskStatus,
} from '@/utils/risk-register';

const props = defineProps<{
  sspId: string;
  // When set, the dashboard drawer is deep-linkable at this route name (params: { componentId })
  // and closing it navigates to dashboardClosePath. When omitted, the drawer is plain local state.
  dashboardRouteName?: string;
  dashboardClosePath?: string;
}>();
const emit = defineEmits<{ count: [number] }>();

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { can, permissionTooltip } = usePermissions();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const componentsEndpoint = computed(() => {
  if (!props.sspId) return null;
  return `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`;
});
const risksEndpoint = computed(() => {
  if (!props.sspId) return null;
  return `/api/oscal/system-security-plans/${props.sspId}/risks`;
});
const usersEndpoint = computed(() => {
  if (!props.sspId) return null;
  return `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users`;
});

const { data: components, execute: fetchComponents } = useDataApi<
  SystemComponent[]
>(null, { method: 'GET' }, { immediate: false });
watch(components, (val) => emit('count', val?.length || 0), {
  immediate: true,
});

const {
  data: risks,
  isLoading: loadingRisks,
  execute: fetchRisks,
} = useDataApi<Risk[]>(null, { method: 'GET' }, { immediate: false });

const { data: users, execute: fetchUsers } = useDataApi<SystemUser[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeDeleteComponent } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const { execute: executeGetComponent } = useDataApi<SystemComponent>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const localOpenComponentId = ref<string | null>(null);

const selectedComponent = computed<SystemComponent | undefined>(() => {
  const componentId = props.dashboardRouteName
    ? ((Array.isArray(route.params.componentId)
        ? route.params.componentId[0]
        : route.params.componentId) ?? undefined)
    : (localOpenComponentId.value ?? undefined);

  if (!componentId || !components.value) {
    return undefined;
  }

  return components.value.find((c) => c.uuid === componentId);
});

const dashboardDrawerOpen = computed({
  get: () =>
    props.dashboardRouteName
      ? !!route.params.componentId
      : !!localOpenComponentId.value,
  set: (val) => {
    if (val) return;
    if (props.dashboardRouteName) {
      router.push({ path: props.dashboardClosePath || '/' });
    } else {
      localOpenComponentId.value = null;
    }
  },
});

function openDashboardDrawer(component: SystemComponent) {
  if (props.dashboardRouteName) {
    router.push({
      name: props.dashboardRouteName,
      params: { componentId: component.uuid },
    });
  } else {
    localOpenComponentId.value = component.uuid ?? null;
  }
}

// Modal states
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const componentPanelsCollapsed = ref<Record<string, boolean>>({});

// Edit targets
const editingComponent = ref<SystemComponent | null>(null);

const loadData = async () => {
  if (!componentsEndpoint.value) {
    components.value = [];
    risks.value = [];
    users.value = [];
    return;
  }

  try {
    await fetchComponents(componentsEndpoint.value);
  } catch (error) {
    components.value = [];
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to load components. ${toErrorDetail(error)}`,
      life: 5000,
    });
  }
  await refreshRisksAndUsers();
};

function normalizeId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function componentPanelCollapsed(componentId?: string): boolean {
  if (!componentId) return true;
  const normalized = normalizeId(componentId);
  return componentPanelsCollapsed.value[normalized] ?? true;
}

function setComponentPanelCollapsed(
  componentId: string | undefined,
  collapsed: boolean,
): void {
  if (!componentId) return;
  const normalized = normalizeId(componentId);
  componentPanelsCollapsed.value = {
    ...componentPanelsCollapsed.value,
    [normalized]: collapsed,
  };
}

function isOpenOrInvestigatingRisk(risk: Risk): boolean {
  const normalized = normalizeRiskStatus(risk.status);
  return normalized === 'open' || normalized === 'investigating';
}

const openRiskCountByComponentId = computed(() => {
  const counts: Record<string, number> = {};

  (risks.value || []).forEach((risk) => {
    if (!isOpenOrInvestigatingRisk(risk)) return;
    getRiskComponentIds(risk)
      .map((id) => normalizeId(id))
      .forEach((componentId) => {
        if (!componentId) return;
        counts[componentId] = (counts[componentId] || 0) + 1;
      });
  });

  return counts;
});

function openComponentRiskCount(component: SystemComponent): number {
  if (!component.uuid) return 0;
  return openRiskCountByComponentId.value[normalizeId(component.uuid)] || 0;
}

function openComponentRiskLabel(component: SystemComponent): string {
  const count = openComponentRiskCount(component);
  return `${count} ${count === 1 ? 'risk' : 'risks'}`;
}

function toErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  return 'Please try again.';
}

async function refreshRisksAndUsers() {
  if (!risksEndpoint.value || !usersEndpoint.value) {
    risks.value = [];
    users.value = [];
    return;
  }

  const [risksResult, usersResult] = await Promise.allSettled([
    fetchRisks(risksEndpoint.value),
    fetchUsers(usersEndpoint.value),
  ]);

  if (risksResult.status === 'rejected') {
    risks.value = [];
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to load risks. ${toErrorDetail(risksResult.reason)}`,
      life: 5000,
    });
  }

  if (usersResult.status === 'rejected') {
    users.value = [];
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to load users. ${toErrorDetail(usersResult.reason)}`,
      life: 5000,
    });
  }
}

watch(
  () => props.sspId,
  async () => {
    await loadData();
  },
  { immediate: true },
);

// Component management
const editComponent = async (component: SystemComponent) => {
  if (!props.sspId) return;

  try {
    const response = await executeGetComponent(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components/${component.uuid}`,
    );
    if (!response.data || !response.data.value) {
      throw new Error('Component not found');
    }
    editingComponent.value = response.data.value.data;
    showEditComponentModal.value = true;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Component not found. Please refresh the page. ${error}`,
      life: 5000,
    });
    loadData();
  }
};

const handleComponentCreated = async (newComponent: SystemComponent) => {
  components.value = [...(components.value ?? []), newComponent];
  showCreateComponentModal.value = false;

  await loadData();
};

const handleComponentSaved = (updatedComponent: SystemComponent) => {
  if (components.value) {
    const index = components.value.findIndex(
      (c) => c.uuid === updatedComponent.uuid,
    );
    if (index !== -1) {
      components.value[index] = updatedComponent;
    }
  }
  showEditComponentModal.value = false;
  editingComponent.value = null;
};

const downloadComponentJSON = (component: SystemComponent) => {
  downloadJson(`component-${component.uuid}.json`, component);
};

const deleteComponent = async (component: SystemComponent) => {
  if (!props.sspId) return;

  try {
    await executeDeleteComponent(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components/${component.uuid}`,
    );
    if (components.value) {
      components.value = components.value.filter(
        (c) => c.uuid !== component.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Component deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    let errorDetail = 'Failed to delete component. Please try again.';

    if (error instanceof Response) {
      if (error.status === 404) {
        errorDetail = 'Component not found. It may have already been deleted.';
      } else if (error.status === 409) {
        errorDetail = 'Cannot delete component. It may be in use.';
      }
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail,
      life: 5000,
    });
  }
};
</script>
