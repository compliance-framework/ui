<template>
  <template v-if="importDefinitions">
    <div
      class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
    >
      <div v-if="importDefinitions.length > 0" class="p-4">
        <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">
          Import Component Definitions
        </h3>
        <div class="space-y-4">
          <div
            v-for="importDef in importDefinitions"
            :key="importDef.href"
            class="border border-ccf-300 dark:border-slate-700 rounded-md p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-gray-900 dark:text-slate-300">
                  {{ importDef.href }}
                </p>
                <p
                  class="text-sm text-gray-600 dark:text-slate-400"
                  v-if="importDef.includeAll"
                >
                  Includes all components from this definition
                </p>
                <div
                  v-if="
                    Array.isArray(importDef.includeControls) &&
                    importDef.includeControls.length > 0
                  "
                  class="mt-2"
                >
                  <p class="text-sm text-gray-600 dark:text-slate-400">
                    Includes controls:
                  </p>
                  <div class="flex flex-wrap gap-2 mt-1">
                    <span
                      v-for="control in importDef.includeControls"
                      :key="control.withId"
                      class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded"
                    >
                      {{ control.withId }}
                    </span>
                  </div>
                </div>
              </div>
              <TertiaryButton @click="editImportDefinition(importDef)">
                Edit
              </TertiaryButton>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-8 text-center">
        <p class="text-gray-500 dark:text-slate-400 mb-4">
          No import definitions configured.
        </p>
        <TertiaryButton @click="handleAddImportDefinition"
          >Add Import Definition</TertiaryButton
        >
      </div>
    </div>

    <div class="mt-4" v-if="importDefinitions.length > 0">
      <TertiaryButton @click="handleAddImportDefinition"
        >Add Import Definition</TertiaryButton
      >
    </div>

    <!-- Import Definition Edit Modal -->
    <ImportDefinitionEditModal
      :is-open="showEditModal"
      :component-definition-id="componentDefinitionId"
      :import-definition="selectedImportDefinition"
      :all-import-definitions="importDefinitions"
      @close="closeEditModal"
      @updated="handleImportDefinitionUpdated"
    />
  </template>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type ImportComponentDefinition } from '@/oscal';
import { useRoute } from 'vue-router';
import TertiaryButton from '@/components/TertiaryButton.vue';
import ImportDefinitionEditModal from '@/components/component-definitions/ImportDefinitionEditModal.vue';
import { useDataApi } from '@/composables/axios';

const route = useRoute();
const componentDefinitionId = ref<string>(route.params.id as string);
const showCreateForm = ref<boolean>(false);
const showEditModal = ref<boolean>(false);
const selectedImportDefinition = ref<ImportComponentDefinition>(
  {} as ImportComponentDefinition,
);

const { data: importDefinitions } = useDataApi<ImportComponentDefinition[]>(
  `/api/oscal/component-definitions/${componentDefinitionId.value}/import-component-definitions`,
  {},
  { initialData: [] as ImportComponentDefinition[] },
);

function editImportDefinition(importDef: ImportComponentDefinition) {
  selectedImportDefinition.value = importDef;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedImportDefinition.value = {} as ImportComponentDefinition;
}

function handleImportDefinitionUpdated(
  updatedImportDefinitions: ImportComponentDefinition[],
) {
  importDefinitions.value = updatedImportDefinitions;
}

function handleAddImportDefinition() {
  showCreateForm.value = true;
}
</script>
