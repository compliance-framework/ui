<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">POAM Items</h2>
      <button
        disabled
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create functionality is currently disabled"
      >
        Add POAM Item
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading POAM items...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading POAM items: {{ error }}</p>
    </div>

    <div v-else-if="!poamItems.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No POAM items found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in poamItems"
        :key="item.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ item.title }}</h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">{{ item.description }}</p>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-if="item.relatedFindings?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {{ item.relatedFindings.length }} Findings
              </span>
              <span v-if="item.relatedObservations?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {{ item.relatedObservations.length }} Observations
              </span>
              <span v-if="item.relatedRisks?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {{ item.relatedRisks.length }} Risks
              </span>
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
        <strong>Read-Only Mode:</strong> Edit and create functionality for POAM items is currently disabled. You can view existing items and their details.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type PoamItem, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const poamItems = ref<PoamItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await poamStore.getPoamItems(id)
    poamItems.value = response.data
  } catch (err) {
    console.error('Error loading POAM items:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script> 