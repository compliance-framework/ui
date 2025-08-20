<template>
  <div class="p-6">

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Title *
        </label>
        <input
          v-model="formData.title"
          type="text"
          required
          placeholder="POAM title"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Version -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Version *
        </label>
        <input
          v-model="formData.version"
          type="text"
          required
          placeholder="1.0.0"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- OSCAL Version -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          OSCAL Version
        </label>
        <input
          v-model="formData.oscalVersion"
          type="text"
          placeholder="1.1.3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Published Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Published Date
        </label>
        <input
          v-model="formData.published"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Last Modified -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Last Modified
        </label>
        <input
          v-model="formData.lastModified"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Remarks -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="4"
          placeholder="Additional remarks..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
        >
          {{ loading ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Metadata } from '@/stores/types'
import { useToast } from 'primevue/usetoast'
import { useDataApi } from '@/composables/axios'
import type { AxiosError } from 'axios'
import type { ErrorResponse, ErrorBody } from '@/stores/types'

interface Props {
  poamId: string
  metadata: Metadata
}

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', metadata: Metadata): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()

const { data: updatedMetadata, isLoading: loading, execute: updateMetadata } = useDataApi<Metadata>(`/api/oscal/plan-of-action-and-milestones/${props.poamId}/metadata`,
  {
    method: 'PUT',
  }, { immediate: false }
)

const formData = ref<Partial<Metadata>>({
  title: '',
  version: '',
  oscalVersion: '',
  published: '',
  lastModified: '',
  remarks: ''
})

onMounted(() => {
  // Convert dates to datetime-local format
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16) // Format as YYYY-MM-DDTHH:MM
  }

  formData.value = {
    title: props.metadata.title || '',
    version: props.metadata.version || '',
    oscalVersion: props.metadata.oscalVersion || '',
    published: formatDateForInput(props.metadata.published),
    lastModified: formatDateForInput(props.metadata.lastModified),
    remarks: props.metadata.remarks || ''
  }
})

async function handleSubmit() {
  try {
    // Convert datetime-local back to ISO string
    const formatDateForAPI = (dateString: string) => {
      if (!dateString) return undefined
      return new Date(dateString).toISOString()
    }

    const metadataToSave: Metadata = {
      ...props.metadata,
      title: formData.value.title || '',
      version: formData.value.version || '',
      oscalVersion: formData.value.oscalVersion || '',
      published: formatDateForAPI(formData.value.published || ''),
      lastModified: formatDateForAPI(formData.value.lastModified || ''),
      remarks: formData.value.remarks || ''
    }

    await updateMetadata({
      data: metadataToSave,
    })
    emit('saved', updatedMetadata.value!)
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: `Failed to save metadata: ${errorResponse.response?.data.errors.body}. Please check your input and try again.`,
      life: 3000
    })
  }
}
</script>
