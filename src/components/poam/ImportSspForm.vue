<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      {{ isEditing ? 'Edit Import SSP' : 'Create Import SSP' }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Href <span class="text-red-500">*</span>
        </label>
        <input
          v-model="formData.href"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter URI reference (e.g., https://example.com/ssp.json)"
        />
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          URI reference to the System Security Plan to import
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Optional remarks about the import"
        ></textarea>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Optional remarks about the import-ssp
        </p>
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
          :disabled="!formData.href || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { type ImportSsp, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
  importSsp?: ImportSsp
}>()

const emit = defineEmits<{
  cancel: []
  saved: [importSsp: ImportSsp]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const saving = ref(false)
const isEditing = computed(() => !!props.importSsp)

const formData = reactive({
  href: '',
  remarks: ''
})

onMounted(() => {
  if (props.importSsp) {
    formData.href = props.importSsp.href
    formData.remarks = props.importSsp.remarks || ''
  }
})

async function handleSubmit() {
  if (!formData.href.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Href is required',
      life: 3000
    })
    return
  }

  saving.value = true

  try {
    const importSspData: ImportSsp = {
      href: formData.href.trim(),
      remarks: formData.remarks.trim() || undefined
    }

    let response
    if (isEditing.value) {
      response = await poamStore.updateImportSsp(props.poamId, importSspData)
    } else {
      response = await poamStore.createImportSsp(props.poamId, importSspData)
    }

    toast.add({
      severity: 'success',
      summary: isEditing.value ? 'Import SSP Updated' : 'Import SSP Created',
      detail: 'Import SSP data saved successfully',
      life: 3000
    })

    emit('saved', response.data)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: `Failed to save import SSP: ${errorMessage}`,
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script> 