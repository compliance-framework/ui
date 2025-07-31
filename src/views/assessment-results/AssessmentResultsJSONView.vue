<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">JSON View</h2>
      <button
        @click="downloadJson"
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
      >
        Download JSON
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading full assessment results...</p>
    </div>
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading assessment results: {{ error }}</p>
    </div>
    <div v-else class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
      <pre class="text-sm text-gray-300 font-mono">{{ jsonContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type PropType } from 'vue'
import { useAssessmentResultsStore, type AssessmentResults } from '@/stores/assessment-results'
import { useConfigStore } from '@/stores/config'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true
  }
})

const arStore = useAssessmentResultsStore()
const configStore = useConfigStore()
const toast = useToast()

const jsonContent = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

async function loadFullAssessmentResults() {
  try {
    loading.value = true
    error.value = null
    
    // Get raw API response without camelCase conversion for display
    const config = await configStore.getConfig()
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-results/${props.assessmentResults.uuid}/full`,
      {
        credentials: 'include'
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.statusText}`)
    }
    
    const data = await response.json()
    jsonContent.value = JSON.stringify(data.data || data, null, 2)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load full assessment results: ${errorMessage}`,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

async function downloadJson() {
  try {
    const dataBlob = new Blob([jsonContent.value], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.assessmentResults.metadata?.title.replace(/[^a-zA-Z0-9]/g, '_')}-assessment-results.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'Download Successful',
      detail: 'Assessment Results JSON downloaded successfully',
      life: 3000
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download JSON: ${errorMessage}`,
      life: 3000
    })
  }
}

onMounted(() => {
  loadFullAssessmentResults()
})
</script>