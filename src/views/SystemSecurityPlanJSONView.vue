<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">JSON View</h3>
      <div class="flex space-x-2">
        <button
          @click="downloadJson"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          :disabled="loading"
        >
          Download JSON
        </button>
        <button
          @click="copyToClipboard"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          :disabled="loading"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading System Security Plan JSON...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading JSON: {{ error }}</p>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4">
      <pre class="text-sm text-gray-900 dark:text-slate-300 overflow-x-auto"><code>{{ formattedJson }}</code></pre>
    </div>

    <!-- Copy Success Message -->
    <div v-if="copySuccess" class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg">
      JSON copied to clipboard!
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'

const route = useRoute()
const sspStore = useSystemSecurityPlanStore()

const sspData = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const copySuccess = ref(false)

const formattedJson = computed(() => {
  if (!sspData.value) return ''
  return JSON.stringify(sspData.value, null, 2)
})

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await sspStore.full(id)
    sspData.value = response.data
  } catch (err) {
    console.error('Error loading System Security Plan JSON:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})

async function downloadJson(): Promise<void> {
  if (!sspData.value) return
  
  try {
    const dataStr = JSON.stringify(sspData.value, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ssp-${sspData.value.uuid || 'unknown'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error downloading JSON:', err)
  }
}

async function copyToClipboard(): Promise<void> {
  if (!sspData.value) return
  
  try {
    const jsonText = JSON.stringify(sspData.value, null, 2)
    await navigator.clipboard.writeText(jsonText)
    
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Error copying to clipboard:', err)
  }
}
</script>