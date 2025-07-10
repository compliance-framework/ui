<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Create POAM Item
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
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { type PoamItem, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
}>()

const emit = defineEmits<{
  cancel: []
  created: [item: PoamItem]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const saving = ref(false)

const formData = reactive({
  title: '',
  description: '',
  remarks: ''
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
    
    const newItem: Partial<PoamItem> = {
      uuid: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      remarks: formData.remarks || undefined
    }
    
    const response = await poamStore.createPoamItem(props.poamId, newItem)
    
    toast.add({
      severity: 'success',
      summary: 'POAM Item Created',
      detail: 'POAM item created successfully',
      life: 3000
    })
    
    emit('created', response.data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Creation Failed',
      detail: `Failed to create POAM item: ${errorMessage}`,
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script> 