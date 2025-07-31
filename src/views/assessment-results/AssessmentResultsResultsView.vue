<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">Results</h2>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Add Result
      </button>
    </div>

    <!-- Results List -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading results...</p>
    </div>
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading results: {{ error }}</p>
    </div>
    <div v-else-if="!results.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No results found.</p>
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="result in results"
        :key="result.uuid"
        class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
              {{ result.title }}
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {{ result.description }}
            </p>
            <div class="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
              <span>Start: {{ formatDate(result.start) }}</span>
              <span v-if="result.end">End: {{ formatDate(result.end) }}</span>
            </div>
            <div class="mt-2 flex items-center gap-4 text-sm">
              <span class="text-gray-500 dark:text-slate-400">
                Observations: {{ result.observations?.length || 0 }}
              </span>
              <span class="text-gray-500 dark:text-slate-400">
                Risks: {{ result.risks?.length || 0 }}
              </span>
              <span class="text-gray-500 dark:text-slate-400">
                Findings: {{ result.findings?.length || 0 }}
              </span>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <RouterLink
              :to="`/assessment-results/${assessmentResults.uuid}/results/${result.uuid}`"
              class="bg-white hover:bg-zinc-100 border border-ccf-300 px-3 py-1 rounded-md text-sm dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            >
              View
            </RouterLink>
            <button
              @click="editResult(result)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="deleteResult(result.uuid)"
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Result Modal -->
    <Dialog
      v-model:visible="showCreateModal"
      modal
      header="Create New Result"
      :style="{ width: '50vw' }"
      :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
    >
      <form @submit.prevent="createResult" class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Title <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            v-model="newResult.title"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Description <span class="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            v-model="newResult.description"
            rows="3"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>

        <div>
          <label for="start" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Start Date <span class="text-red-500">*</span>
          </label>
          <input
            id="start"
            v-model="newResult.start"
            type="datetime-local"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>

        <div>
          <label for="end" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
            End Date
          </label>
          <input
            id="end"
            v-model="newResult.end"
            type="datetime-local"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          />
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            @click="showCreateModal = false"
            class="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="creating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useAssessmentResultsStore, type AssessmentResults, type Result } from '@/stores/assessment-results'
import { useToast } from 'primevue/usetoast'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true
  }
})

const emit = defineEmits(['update'])

const router = useRouter()
const arStore = useAssessmentResultsStore()
const toast = useToast()

const results = ref<Result[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const creating = ref(false)

const newResult = ref({
  title: '',
  description: '',
  start: new Date().toISOString().slice(0, 16),
  end: ''
})

async function loadResults() {
  try {
    loading.value = true
    error.value = null
    const response = await arStore.getResults(props.assessmentResults.uuid)
    results.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load results: ${errorMessage}`,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

async function createResult() {
  creating.value = true
  
  try {
    const result = {
      uuid: uuidv4(),
      title: newResult.value.title,
      description: newResult.value.description,
      start: new Date(newResult.value.start).toISOString(),
      end: newResult.value.end ? new Date(newResult.value.end).toISOString() : undefined,
      reviewedControls: {
        controlSelections: [{
          includeAll: {}
        }]
      }
    }
    
    await arStore.createResult(props.assessmentResults.uuid, result)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Result created successfully',
      life: 3000
    })
    
    showCreateModal.value = false
    newResult.value = {
      title: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: ''
    }
    
    await loadResults()
    emit('update')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to create result: ${errorMessage}`,
      life: 5000
    })
  } finally {
    creating.value = false
  }
}

function editResult(result: Result) {
  router.push(`/assessment-results/${props.assessmentResults.uuid}/results/${result.uuid}/edit`)
}

async function deleteResult(resultId: string) {
  if (!confirm('Are you sure you want to delete this result? This action cannot be undone.')) {
    return
  }

  try {
    await arStore.deleteResult(props.assessmentResults.uuid, resultId)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Result deleted successfully',
      life: 3000
    })
    
    await loadResults()
    emit('update')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to delete result: ${errorMessage}`,
      life: 5000
    })
  }
}

onMounted(() => {
  loadResults()
})
</script>