<template>
  <!-- Tabbed Interface -->
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">
        System Components
      </h3>
      <button
        @click="showCreateComponentModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Create Component
      </button>
    </div>

    <div class="space-y-4">
      <div
        v-if="components?.length === 0"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No components defined. Create your first component to get started.
      </div>

      <Panel
        v-for="component in components"
        :key="component.uuid"
        collapsed
        toggleable
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
          </div>
        </template>
        <div class="py-3 px-4 flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <span class="font-medium text-gray-900 dark:text-slate-300">{{
              component.title
            }}</span>
          </div>
          <div class="flex gap-2">
            <button
              @click.stop="editComponent(component)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
            <button
              @click.stop="downloadComponentJSON(component)"
              class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              JSON
            </button>
            <button
              @click.stop="deleteComponent(component)"
              class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
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
        </div>
      </Panel>
    </div>
  </div>

  <!-- Component Create Modal -->
  <Modal
    :show="showCreateComponentModal"
    @close="showCreateComponentModal = false"
  >
    <SystemImplementationComponentCreateForm
      :ssp-id="system.securityPlan?.uuid as string"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Modal>

  <!-- Component Edit Modal -->
  <Modal
    :show="!!(showEditComponentModal && editingComponent)"
    @close="showEditComponentModal = false"
  >
    <SystemImplementationComponentEditForm
      :ssp-id="system.securityPlan?.uuid as string"
      :component="editingComponent!"
      @cancel="showEditComponentModal = false"
      @saved="handleComponentSaved"
    />
  </Modal>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';

// Form components
import Modal from '@/components/Modal.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';

// Types and stores;
import { type SystemComponent, type SystemSecurityPlan } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import Panel from '@/volt/Panel.vue';
import { useDataApi } from '@/composables/axios';

const toast = useToast();
const { system } = useSystemStore();

// Data
const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);

const { data: components, execute: fetchComponents } = useDataApi<
  SystemComponent[]
>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/components`,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeDeleteComponent } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

const { execute: executeGetComponent } = useDataApi<SystemComponent>(
  null,
  {
    method: 'GET',
  },
  { immediate: false },
);

// Modal states
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);

// Edit targets
const editingComponent = ref<SystemComponent | null>(null);

const loadData = async () => {
  systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

  await fetchComponents();
};

onMounted(async () => {
  await loadData();
});

// Component management
const editComponent = async (component: SystemComponent) => {
  // Verify the component still exists before editing
  try {
    const response = await executeGetComponent(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/components/${component.uuid}`,
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
    // Refresh the component list
    loadData();
  }
};

const handleComponentCreated = async (newComponent: SystemComponent) => {
  // Add the component to the local array
  components.value?.push(newComponent);
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
  const dataStr = JSON.stringify(decamelizeKeys(component), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `component-${component.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteComponent = async (component: SystemComponent) => {
  if (
    !confirm(`Are you sure you want to delete component "${component.title}"?`)
  ) {
    return;
  }

  try {
    await executeDeleteComponent(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/components/${component.uuid}`,
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
const formatComponentType = (type: string): string => {
  // Format common OSCAL component types
  const typeMap: Record<string, string> = {
    software: 'Software',
    hardware: 'Hardware',
    service: 'Service',
    policy: 'Policy',
    physical: 'Physical',
    'org-defined': 'Organization Defined',
    process: 'Process',
    procedure: 'Procedure',
    plan: 'Plan',
    guidance: 'Guidance',
    standard: 'Standard',
    validation: 'Validation',
    unspecified: 'Unspecified',
  };

  return (
    typeMap[type.toLowerCase()] ||
    type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};
</script>
