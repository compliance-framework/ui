<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Back Matter</h2>
      <button
        disabled
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create functionality is currently disabled"
      >
        Add Resource
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading back matter...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading back matter: {{ error }}</p>
    </div>

    <div v-else-if="!backMatter?.resources?.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No resources found in back matter.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="resource in backMatter.resources"
        :key="resource.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ resource.title || 'Untitled Resource' }}</h3>
            <p v-if="resource.description" class="text-gray-600 dark:text-slate-400 mt-2">{{ resource.description }}</p>
            
            <div v-if="resource.documentIds?.length" class="mt-2">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Document IDs:</strong>
                <span v-for="docId in resource.documentIds" :key="docId.identifier" class="ml-2">
                  {{ docId.scheme }}: {{ docId.identifier }}
                </span>
              </p>
            </div>
            
            <div v-if="resource.citation" class="mt-2">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Citation:</strong> {{ resource.citation.text }}
              </p>
            </div>
            
            <div v-if="resource.rlinks?.length" class="mt-2">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Links:</strong>
                <a 
                  v-for="rlink in resource.rlinks" 
                  :key="rlink.href"
                  :href="rlink.href"
                  target="_blank"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-2"
                >
                  {{ rlink.href }}
                </a>
              </p>
            </div>
          </div>
          
          <div class="ml-4">
            <button
              disabled
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit functionality is currently disabled"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Notice -->
    <div class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Read-Only Mode:</strong> Edit and create functionality for back matter resources is currently disabled. You can view existing resources and their details.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type BackMatter, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const backMatter = ref<BackMatter | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await poamStore.getBackMatter(id)
    backMatter.value = response.data
  } catch (err) {
    console.error('Error loading back matter:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script> 