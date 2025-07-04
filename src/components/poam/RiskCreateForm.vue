<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Create Risk
    </h3>
    
    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Title
        </label>
        <input
          v-model="formData.title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk title"
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
          placeholder="Enter risk description"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Statement
        </label>
        <textarea
          v-model="formData.statement"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk statement (optional)"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Threat IDs
        </label>
        <div class="space-y-2">
          <div v-for="(threatId, index) in formData.threatIds" :key="index" class="flex gap-2">
            <input
              v-model="formData.threatIds[index]"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Enter threat ID"
            />
            <button
              type="button"
              @click="removeThreatId(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addThreatId"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Threat ID
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Deadline
        </label>
        <input
          v-model="formData.deadline"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
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
          :disabled="!formData.description || saving"
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
import { type Risk, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
}>()

const emit = defineEmits<{
  cancel: []
  created: [risk: Risk]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const saving = ref(false)

const formData = reactive({
  title: '',
  description: '',
  statement: '',
  threatIds: [] as string[],
  deadline: '',
  remarks: ''
})

function addThreatId() {
  formData.threatIds.push('')
}

function removeThreatId(index: number) {
  formData.threatIds.splice(index, 1)
}

async function submit() {
  if (!formData.description) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required',
      life: 3000
    })
    return
  }

  try {
    saving.value = true
    
    const newRisk: Partial<Risk> = {
      uuid: crypto.randomUUID(),
      title: formData.title || undefined,
      description: formData.description,
      statement: formData.statement || undefined,
      threatIds: formData.threatIds.filter(t => t.trim()).length > 0 ? formData.threatIds.filter(t => t.trim()) : undefined,
      deadline: formData.deadline || undefined,
      remarks: formData.remarks || undefined
    }
    
    const response = await poamStore.createRisk(props.poamId, newRisk)
    
    toast.add({
      severity: 'success',
      summary: 'Risk Created',
      detail: 'Risk created successfully',
      life: 3000
    })
    
    emit('created', response.data)
  } catch (error) {
    console.error('Error creating risk:', error)
    toast.add({
      severity: 'error',
      summary: 'Creation Failed',
      detail: 'Failed to create risk. Please try again.',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script> 