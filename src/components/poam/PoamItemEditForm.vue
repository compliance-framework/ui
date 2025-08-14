<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Edit POAM Item
    </h3>

    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Title <span class="text-red-500">*</span>
        </label>
        <input
          v-model="formData.title"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter POAM item title"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.description"
          required
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter POAM item description"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter additional remarks (optional)"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!formData.title || !formData.description || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Updating...' : 'Update' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import type { PoamItem } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'
import { useDataApi, decamelizeKeys } from '@/composables/axios'
import type { AxiosError } from 'axios'
import type { ErrorResponse, ErrorBody } from '@/stores/types'

const props = defineProps<{
  poamId: string
  item: PoamItem
}>()

const emit = defineEmits<{
  cancel: []
  saved: [item: PoamItem]
}>()

const toast = useToast()
const { data: updatedPOAMItem, isLoading: saving, execute: updatePoamItem } = useDataApi<PoamItem>(`/api/oscal/plan-of-action-and-milestones/${props.poamId}/poam-items/${props.item.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys]
  }, { immediate: false }
)

const formData = reactive({
  title: '',
  description: '',
  remarks: ''
})

onMounted(() => {
  // Pre-populate form with existing item data
  formData.title = props.item.title
  formData.description = props.item.description
  formData.remarks = props.item.remarks || ''
})

async function submit() {
  if (!formData.title || !formData.description) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title and description are required',
      life: 3000
    })
    return
  }

  try {
    saving.value = true

    const updatedItem: PoamItem = {
      ...props.item,
      title: formData.title,
      description: formData.description,
      remarks: formData.remarks || undefined
    }

    await updatePoamItem({
      data: updatedItem
    })

    toast.add({
      severity: 'success',
      summary: 'POAM Item Updated',
      detail: 'POAM item updated successfully',
      life: 3000
    })

    emit('saved', updatedPOAMItem.value!)
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>
    const errorMessage = errorResponse.response?.data.errors.body || 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: `Failed to update POAM item: ${errorMessage}`,
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script>
