<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Import SSP</h2>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading import SSP data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading import SSP data: {{ error }}</p>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No import SSP data available.</p>
    </div>

    <!-- Feature Notice -->
    <div class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Read-Only Mode:</strong> Import SSP functionality is currently disabled. The backend endpoint is not yet implemented.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  await loadImportSsp()
})

async function loadImportSsp() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    await poamStore.getImportSsp(id)
  } catch (err) {
    console.error('Error loading import SSP:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}
</script> 