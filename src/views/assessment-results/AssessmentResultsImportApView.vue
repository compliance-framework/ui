<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-6">Import Assessment Plan</h2>

    <form @submit.prevent="updateImportAp" class="space-y-4">
      <div>
        <label for="href" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Href <span class="text-red-500">*</span>
        </label>
        <input
          id="href"
          v-model="formData.href"
          type="text"
          required
          placeholder="#assessment-plan-uuid"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
        <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Reference to the assessment plan UUID (e.g., #uuid-of-assessment-plan)
        </p>
      </div>

      <div>
        <label for="remarks" class="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Remarks
        </label>
        <textarea
          id="remarks"
          v-model="formData.remarks"
          rows="4"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button
          type="submit"
          :disabled="updating"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {{ updating ? 'Updating...' : 'Update Import AP' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type PropType } from 'vue'
import { useAssessmentResultsStore, type AssessmentResults } from '@/stores/assessment-results'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true
  }
})

const emit = defineEmits(['update'])

const arStore = useAssessmentResultsStore()
const toast = useToast()

const updating = ref(false)
const formData = ref({
  href: '',
  remarks: ''
})

onMounted(() => {
  // Initialize form with current data
  formData.value = {
    href: props.assessmentResults.importAp?.href || '',
    remarks: props.assessmentResults.importAp?.remarks || ''
  }
})

async function updateImportAp() {
  updating.value = true
  
  try {
    await arStore.updateImportAp(props.assessmentResults.uuid, formData.value)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Import AP updated successfully',
      life: 3000
    })
    
    emit('update')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to update Import AP: ${errorMessage}`,
      life: 5000
    })
  } finally {
    updating.value = false
  }
}
</script>