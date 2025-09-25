<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-2 px-4 flex items-center gap-4">
        <span
          class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
          >{{ component.type }}</span
        >
        <div class="grow">
          {{ component.title }}
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1"
            >Component</span
          >
        </div>
        <div class="flex gap-2">
          <TertiaryButton
            class="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
            @click.stop="editComponent"
          >
            Edit
          </TertiaryButton>
          <TertiaryButton
            class="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200"
            @click.stop="downloadComponentJSON"
            title="Download Component JSON"
          >
            JSON
          </TertiaryButton>
        </div>
      </div>
    </template>

    <div
      class="px-4 py-4 dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="grow">
          <div class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">
              Description
            </h4>
            <p class="text-gray-700 dark:text-slate-400">
              {{ component.description }}
            </p>
          </div>

          <div class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">
              Purpose
            </h4>
            <p class="text-gray-700 dark:text-slate-400">
              {{ component.purpose }}
            </p>
          </div>

          <div v-if="controlImplementations.length > 0" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">
              Control Implementations
            </h4>
            <div class="space-y-2">
              <div
                v-for="impl in controlImplementations"
                :key="impl.uuid"
                class="bg-gray-50 dark:bg-slate-800 p-3 rounded-md"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-sm">{{ impl.source }}</p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      {{ impl.description }}
                    </p>
                  </div>
                  <span
                    class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded"
                  >
                    {{ impl.implementedRequirements?.length || 0 }} requirements
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="rounded-md border border-ccf-300 dark:border-slate-700 min-w-48"
        >
          <table class="table-auto w-full">
            <tbody>
              <tr>
                <td colspan="2" class="px-2 py-2 font-medium">Attributes</td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">UUID</td>
                <td class="px-2 py-1 text-xs font-mono">
                  {{ component.uuid }}
                </td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">Type</td>
                <td class="px-2 py-1">{{ component.type }}</td>
              </tr>
              <tr
                class="border-t dark:border-slate-700"
                v-if="responsibleRoles.length > 0"
              >
                <td class="px-2 py-1">Roles</td>
                <td class="px-2 py-1">{{ responsibleRoles.length }}</td>
              </tr>
              <tr
                class="border-t dark:border-slate-700"
                v-if="component.protocols && component.protocols?.length > 0"
              >
                <td class="px-2 py-1">Protocols</td>
                <td class="px-2 py-1">{{ component.protocols?.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </CollapsableGroup>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config.ts';
import type {
  ComponentDefinitionControlImplementation,
  DefinedComponent,
  ResponsibleRole,
} from '@/oscal';

const props = defineProps<{
  component: DefinedComponent;
  componentDefinitionId: string;
}>();

const componentDefinitionStore = useComponentDefinitionStore();
const configStore = useConfigStore();
const toast = useToast();
const controlImplementations = ref<ComponentDefinitionControlImplementation[]>(
  [],
);
const responsibleRoles = ref<ResponsibleRole[]>([]);

onMounted(async () => {
  try {
    // Load control implementations for this component
    const response = await componentDefinitionStore.getControlImplementations(
      props.componentDefinitionId,
      props.component.uuid,
    );
    controlImplementations.value = response.data;

    // Load responsible roles (would be in the component data)
    responsibleRoles.value = props.component.responsibleRoles || [];
  } catch (error) {
    console.warn('Error: ', error);
    toast.add({
      severity: 'error',
      summary: 'Error Loading Component Details',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error loading control implementations and roles for this component.',
      life: 3000,
    });
  }
});

const emit = defineEmits<{
  edit: [component: DefinedComponent];
}>();

function editComponent() {
  emit('edit', props.component);
}

async function downloadComponentJSON() {
  try {
    // Get raw API response without camelCase conversion
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/component-definitions/${props.componentDefinitionId}/components/${props.component.uuid}`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw response;
    }
    const data = await response.json();

    const jsonData = JSON.stringify(data, null, 2);

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.component.title.replace(/[^a-zA-Z0-9]/g, '_') || 'component'}-component.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Component JSON Downloaded',
      detail: `Component "${props.component.title}" JSON downloaded successfully`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error downloading component JSON.',
      life: 3000,
    });
  }
}
</script>
