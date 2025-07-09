<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">POAM JSON View</h2>
      <button
        @click="downloadJson"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Download JSON
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading POAM data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading POAM data: {{ error }}</p>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <pre class="p-4 overflow-auto text-sm text-gray-900 dark:text-slate-300 bg-gray-50 dark:bg-slate-800">{{ formattedJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { type PlanOfActionAndMilestones, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const poamData = ref<PlanOfActionAndMilestones | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const formattedJson = computed(() => {
  if (!poamData.value) return ''
  return JSON.stringify(poamData.value, null, 2)
})

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await poamStore.full(id)
    poamData.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
})

async function downloadJson(): Promise<void> {
  if (!poamData.value) return
  
  try {
    const dataStr = JSON.stringify(poamData.value, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${poamData.value.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'poam'}-poam.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading JSON:', error)
  }
}
</script> 