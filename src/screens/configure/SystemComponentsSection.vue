<script setup lang="ts">
/**
 * Configure System → Components: the system's components, each opening to its description,
 * purpose, protocols and risks, with Dashboards (evidence filters), Edit, Download and Delete.
 * The script is the classic ComponentsPanel's.
 */
import { computed, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { downloadJson } from '@/utils/download-json';
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

import SystemComponentForm from './SystemComponentForm.vue';
import ComponentDashboardsView from '@/views/system/partials/ComponentDashboardsView.vue';
import ComponentRisksList from '@/views/system/partials/ComponentRisksList.vue';

import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useConfigStore } from '@/stores/config';
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
const { can } = usePermissions();
const denied = (action: string, verb: string) =>
  can(RESOURCES.SSP, action)
    ? undefined
    : `Your access doesn't include ${verb} this system's components.`;
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const configStore = useConfigStore();
const filterComponentLinkingEnabled = computed(
  () => configStore.filterComponentLinkingEnabled,
);
onMounted(() => configStore.getConfig());

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

// Design-system view ---------------------------------------------------------------------------

function componentFacts(component: SystemComponent) {
  return [
    { key: 'description', label: 'Description', value: component.description },
    { key: 'purpose', label: 'Purpose', value: component.purpose },
    {
      key: 'protocols',
      label: 'Protocols',
      value: (component.protocols ?? [])
        .map((p) =>
          [
            p.title || p.name,
            ...(p.portRanges ?? []).map(
              (r) => `${r.transport} ${r.start}–${r.end}`,
            ),
          ].join(' · '),
        )
        .join('; '),
    },
  ];
}
function componentActions(component: SystemComponent): MenuEntry[] {
  return [
    ...(filterComponentLinkingEnabled.value
      ? [
          {
            label: 'Evidence filters',
            icon: 'filter' as const,
            onSelect: () => openDashboardDrawer(component),
          },
        ]
      : []),
    {
      label: 'Edit',
      icon: 'edit',
      disabledReason: denied(ACTIONS.UPDATE, 'changing'),
      onSelect: () => void editComponent(component),
    },
    {
      label: 'Download source (JSON)',
      icon: 'download',
      onSelect: () => void downloadComponentJSON(component),
    },
    {
      label: 'Delete component',
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied(ACTIONS.DELETE, 'deleting'),
      onSelect: () =>
        confirmDeleteDialog(() => deleteComponent(component), {
          itemName: component.title,
          itemType: 'component',
        }),
    },
  ];
}
</script>

<template>
  <Panel title="Components" :level="2">
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'adding')"
        @click="showCreateComponentModal = true"
        >New component</Button
      >
    </template>
    <Text v-if="!components?.length"
      >No components yet. Components are the parts of the system, such as
      services, clusters or databases.</Text
    >
    <Disclosure
      v-for="component in components"
      :key="component.uuid"
      :label="component.title"
      :open="!componentPanelCollapsed(component.uuid)"
      @update:open="(open) => setComponentPanelCollapsed(component.uuid, !open)"
    >
      <Stack gap="4">
        <Cluster justify="between" gap="2">
          <Cluster gap="1">
            <Tag :label="component.type" />
            <Tag :label="component.status?.state || 'unknown'" />
            <Tag
              v-if="openComponentRiskCount(component) > 0"
              :label="openComponentRiskLabel(component)"
            />
          </Cluster>
          <Menu
            :label="`Actions for ${component.title}`"
            :items="componentActions(component)"
          />
        </Cluster>
        <DescriptionList :items="componentFacts(component)" layout="stacked" />
        <ComponentRisksList
          v-if="!componentPanelCollapsed(component.uuid)"
          :ssp-id="sspId"
          :component="component"
          :risks="risks || []"
          :users="users || []"
          :loading-risks="loadingRisks"
          @risks-updated="refreshRisksAndUsers"
        />
      </Stack>
    </Disclosure>

    <Drawer
      v-if="filterComponentLinkingEnabled"
      v-model:open="dashboardDrawerOpen"
      title="Evidence filters"
      :description="selectedComponent?.title"
    >
      <ComponentDashboardsView
        v-if="selectedComponent"
        :ssp-id="sspId"
        :component="selectedComponent"
      />
    </Drawer>
    <Dialog
      v-model:open="showCreateComponentModal"
      title="New component"
      size="l"
    >
      <SystemComponentForm
        v-if="showCreateComponentModal"
        :ssp-id="sspId"
        @cancel="showCreateComponentModal = false"
        @created="handleComponentCreated"
      />
    </Dialog>
    <Dialog
      v-model:open="showEditComponentModal"
      title="Edit component"
      size="l"
    >
      <SystemComponentForm
        v-if="editingComponent"
        :ssp-id="sspId"
        :component="editingComponent!"
        @cancel="showEditComponentModal = false"
        @saved="handleComponentSaved"
      />
    </Dialog>
  </Panel>
</template>
