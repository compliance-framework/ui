<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-4">Metadata</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Title</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ assessmentResults.metadata?.title }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Version</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ assessmentResults.metadata?.version }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Published</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ formatDate(assessmentResults.metadata?.published) }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Last Modified</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ formatDate(assessmentResults.metadata?.lastModified) }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">OSCAL Version</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ assessmentResults.metadata?.oscalVersion || '1.1.3' }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">UUID</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200 font-mono text-xs">{{ assessmentResults.uuid }}</p>
        </div>
      </div>

      <div class="mt-4" v-if="assessmentResults.metadata?.remarks">
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Remarks</label>
        <p class="mt-1 text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap">{{ assessmentResults.metadata.remarks }}</p>
      </div>
    </div>

    <!-- Import AP -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-4">Import Assessment Plan</h2>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Href</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">{{ assessmentResults.importAp?.href || 'N/A' }}</p>
        </div>

        <div v-if="assessmentResults.importAp?.remarks">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Remarks</label>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap">{{ assessmentResults.importAp.remarks }}</p>
        </div>
      </div>
    </div>

    <!-- Results Summary -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-4">Results Summary</h2>

      <div class="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
        <p class="text-sm text-gray-700 dark:text-slate-300">
          This assessment contains <span class="font-semibold">{{ assessmentResults.results?.length || 0 }}</span> result(s).
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-slate-700">
      <div>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/edit`"
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
        >
          Edit Metadata
        </RouterLink>
      </div>

      <div class="flex gap-2">
        <button
          @click="downloadJson"
          class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Download JSON
        </button>

        <button
          @click="deleteAssessmentResults"
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useToast } from 'primevue/usetoast'
import type { AssessmentResults } from '@/stores/assessment-results'
import { useDataApi } from '@/composables/axios'

const props = defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true
  }
})

const router = useRouter()
const configStore = useConfigStore()
const toast = useToast()

const { execute: executeDelete } = useDataApi<void>(`/api/oscal/assessment-results/${props.assessmentResults.uuid}`, {
  method: 'DELETE',
}, { immediate: false})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

async function downloadJson() {
  try {
    const config = await configStore.getConfig()
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-results/${props.assessmentResults.uuid}/full`,
      {
        credentials: 'include'
      }
    )
    if (!response.ok) {
      throw response
    }
    const data = await response.json()

    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

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

async function deleteAssessmentResults() {
  if (!confirm('Are you sure you want to delete this Assessment Results? This action cannot be undone.')) {
    return
  }

  try {
    await executeDelete()

    toast.add({
      severity: 'success',
      summary: 'Delete Successful',
      detail: 'Assessment Results deleted successfully',
      life: 3000
    })

    router.push({ name: 'assessment-results' })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete Assessment Results: ${errorMessage}`,
      life: 3000
    })
  }
}
</script>
