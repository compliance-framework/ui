<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
    v-if="componentDefinition && characteristics"
  >
    <div v-if="componentDefinition.metadata">
      <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">Metadata</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Title</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ componentDefinition.metadata.title }}
          </p>
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >UUID</label
          >
          <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">
            {{ componentDefinition.uuid }}
          </p>
        </div>
      </div>

      <div v-if="componentDefinition.metadata.remarks" class="mb-6">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Remarks</label
        >
        <p class="text-gray-900 dark:text-slate-300">
          {{ componentDefinition.metadata.remarks }}
        </p>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex gap-3">
        <RouterLink
          :to="{
            name: 'component-definition-edit',
            params: { id: componentDefinition.uuid },
          }"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
        >
          Edit Component
        </RouterLink>
        <RouterLink
          :to="{
            name: 'component-definition-components',
            params: { id: componentDefinition.uuid },
          }"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit Components
        </RouterLink>
        <RouterLink
          :to="{
            name: 'component-definition-capabilities',
            params: { id: componentDefinition.uuid },
          }"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Edit Capabilities
        </RouterLink>
      </div>

      <!-- Feature Notice -->
      <div
        class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
      >
        <p class="text-sm text-blue-800 dark:text-blue-200">
          <strong>Available Features:</strong> You can edit components (title,
          description, purpose, type, remarks) and capabilities (name,
          description). Component definition metadata is read-only but can be
          viewed for reference.
        </p>
      </div>

      <!-- Summary Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ componentCounts.components }}
          </div>
          <div class="text-sm text-blue-600 dark:text-blue-400">Components</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ componentCounts.capabilities }}
          </div>
          <div class="text-sm text-green-600 dark:text-green-400">
            Capabilities
          </div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {{ componentCounts.importDefinitions }}
          </div>
          <div class="text-sm text-purple-600 dark:text-purple-400">
            Import Definitions
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">
        Loading component definition...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  Capability,
  ComponentDefinition,
  ComponentDefinitionCharacteristics,
  DefinedComponent,
  ImportComponentDefinition,
} from '@/stores/component-definitions.ts';
import { useRoute } from 'vue-router';
import { useDataApi } from '@/composables/axios';

const route = useRoute();

const { data: componentDefinition } = useDataApi<ComponentDefinition>(
  `/api/oscal/component-definitions/${route.params.id}`,
);
const { data: characteristics } =
  useDataApi<ComponentDefinitionCharacteristics>(
    `/api/oscal/component-definitions/${route.params.id}/characteristics`,
    {},
    { initialData: {} as ComponentDefinitionCharacteristics, immediate: true },
  );

const { data: importComponentDefinitions } = useDataApi<
  ImportComponentDefinition[]
>(
  `/api/oscal/component-definitions/${route.params.id}/import-component-definitions`,
);
const { data: components } = useDataApi<DefinedComponent[]>(
  `/api/oscal/component-definitions/${route.params.id}/components`,
);
const { data: capabilities } = useDataApi<Capability[]>(
  `/api/oscal/component-definitions/${route.params.id}/capabilities`,
);

const componentCounts = computed(() => ({
  components: components.value?.length || 0,
  capabilities: capabilities.value?.length || 0,
  importDefinitions: importComponentDefinitions.value?.length || 0,
}));
</script>
