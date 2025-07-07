<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Local Definitions</h2>
      <div class="flex gap-2">
        <button
          @click="showCreateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Create New Local Definitions
        </button>
        <button
          v-if="localDefinitions"
          @click="showEditModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit Local Definitions
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading local definitions data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading local definitions data: {{ error }}</p>
    </div>

    <div v-else-if="localDefinitions" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
      <div class="space-y-6">
        <!-- Components Section -->
        <div v-if="localDefinitions.components && localDefinitions.components.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300 mb-3">Components</h3>
          <div class="space-y-3">
            <div 
              v-for="(component, index) in localDefinitions.components" 
              :key="index"
              class="p-4 bg-gray-50 dark:bg-slate-800 rounded border"
            >
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-900 dark:text-slate-300">
                  {{ component.title || 'Untitled Component' }}
                </h4>
                <span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {{ component.type || 'Unknown' }}
                </span>
              </div>
              <p v-if="component.description" class="text-sm text-gray-600 dark:text-slate-400 mb-2">
                {{ component.description }}
              </p>
              <div class="flex justify-between items-center text-xs">
                <span class="text-gray-500 dark:text-slate-500">
                  ID: {{ component.uuid }}
                </span>
                <span v-if="component.status" class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                  {{ component.status.state || 'Unknown' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Items Section -->
        <div v-if="localDefinitions.inventoryItems && localDefinitions.inventoryItems.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300 mb-3">Inventory Items</h3>
          <div class="space-y-3">
            <div 
              v-for="(item, index) in localDefinitions.inventoryItems" 
              :key="index"
              class="p-4 bg-gray-50 dark:bg-slate-800 rounded border"
            >
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-900 dark:text-slate-300">
                  Inventory Item {{ index + 1 }}
                </h4>
              </div>
              <p class="text-sm text-gray-600 dark:text-slate-400 mb-2">
                {{ item.description }}
              </p>
              <div class="text-xs text-gray-500 dark:text-slate-500">
                ID: {{ item.uuid }}
              </div>
              <p v-if="item.remarks" class="text-sm text-gray-600 dark:text-slate-400 mt-2 italic">
                {{ item.remarks }}
              </p>
            </div>
          </div>
        </div>

        <!-- Assessment Assets Section -->
        <div v-if="localDefinitions.assessmentAssets && localDefinitions.assessmentAssets.components && localDefinitions.assessmentAssets.components.length > 0">
          <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300 mb-3">Assessment Assets</h3>
          <div class="space-y-3">
            <div class="p-4 bg-gray-50 dark:bg-slate-800 rounded border">
              <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-3">Components</h4>
              <div class="space-y-2">
                <div 
                  v-for="(component, index) in localDefinitions.assessmentAssets.components" 
                  :key="index"
                  class="p-3 bg-white dark:bg-slate-900 rounded border"
                >
                  <div class="flex justify-between items-start">
                    <span class="text-sm font-medium text-gray-900 dark:text-slate-300">
                      {{ component.title || 'Untitled Component' }}
                    </span>
                    <span class="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                      Assessment
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    ID: {{ component.uuid }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Remarks Section -->
        <div v-if="localDefinitions.remarks">
          <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300 mb-3">Remarks</h3>
          <p class="text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ localDefinitions.remarks }}</p>
        </div>

        <!-- Empty State -->
        <div v-if="!localDefinitions.components?.length && !localDefinitions.inventoryItems?.length && !localDefinitions.assessmentAssets?.components?.length && !localDefinitions.remarks" class="text-center py-8">
          <p class="text-gray-500 dark:text-slate-400">No local definitions data available.</p>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No local definitions data available.</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Create Local Definitions
      </button>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <LocalDefinitionsForm 
        :poam-id="route.params.id as string"
        :local-definitions="undefined"
        @cancel="showCreateModal = false"
        @saved="handleLocalDefinitionsSaved"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false" size="lg">
      <LocalDefinitionsForm 
        :poam-id="route.params.id as string"
        :local-definitions="localDefinitions || undefined"
        @cancel="showEditModal = false"
        @saved="handleLocalDefinitionsSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type LocalDefinitions, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import LocalDefinitionsForm from '@/components/poam/LocalDefinitionsForm.vue'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const loading = ref(true)
const error = ref<string | null>(null)
const localDefinitions = ref<LocalDefinitions | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)

onMounted(async () => {
  await loadLocalDefinitions()
})

async function loadLocalDefinitions() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getLocalDefinitions(id)
    localDefinitions.value = response.data
  } catch (err) {
    console.error('Error loading local definitions:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

function handleLocalDefinitionsSaved(savedLocalDefinitions: LocalDefinitions) {
  localDefinitions.value = savedLocalDefinitions
  showCreateModal.value = false
  showEditModal.value = false
}
</script> 