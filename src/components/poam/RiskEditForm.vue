<template>
  <div class="p-6">

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
          Statement <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.statement"
          required
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk statement"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Status <span class="text-red-500">*</span>
        </label>
        <select
          v-model="formData.status"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">Select status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="risk-accepted">Risk Accepted</option>
          <option value="mitigation-implemented">Mitigation Implemented</option>
          <option value="mitigation-planned">Mitigation Planned</option>
        </select>
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
          :disabled="!formData.title || !formData.description || !formData.statement || !formData.status || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import type { Risk } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const props = defineProps<{
  poamId: string
  risk: Risk
}>()

const emit = defineEmits<{
  cancel: []
  saved: [risk: Risk]
}>()

const toast = useToast()

const { data: returnedRisk, isLoading: saving, execute: updateRisk } = useDataApi<Risk>(
  `/api/oscal/plan-of-action-and-milestones/${props.poamId}/risks/${props.risk.uuid}`,
  {
    method: 'PUT',
  transformRequest: [decamelizeKeys]
  }, { immediate: false }
)

const formData = reactive({
  title: '',
  description: '',
  statement: '',
  status: '',
  threatIds: [] as string[],
  deadline: '',
  remarks: ''
})

onMounted(() => {
  // Initialize form with existing data
  formData.title = props.risk.title || ''
  formData.description = props.risk.description
  formData.statement = props.risk.statement || ''
  formData.status = props.risk.status
  formData.threatIds = [...(props.risk.threatIds || [])]
  formData.deadline = props.risk.deadline || ''
  formData.remarks = props.risk.remarks || ''
})

function addThreatId() {
  formData.threatIds.push('')
}

function removeThreatId(index: number) {
  formData.threatIds.splice(index, 1)
}

async function submit() {
  if (!formData.title) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title is required',
      life: 3000
    })
    return
  }

  if (!formData.description) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required',
      life: 3000
    })
    return
  }

  if (!formData.statement) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Statement is required',
      life: 3000
    })
    return
  }

  if (!formData.status) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Status is required',
      life: 3000
    })
    return
  }

  try {
    const filteredThreatIds = formData.threatIds.filter(t => t.trim());
    const updatedRisk: Risk = {
      ...props.risk,
      title: formData.title,
      description: formData.description,
      statement: formData.statement,
      status: formData.status,
      threatIds: filteredThreatIds.length > 0 ? filteredThreatIds : undefined,
      deadline: formData.deadline || undefined,
      remarks: formData.remarks || undefined
    }

     await updateRisk({
      data: updatedRisk
    })

    toast.add({
      severity: 'success',
      summary: 'Risk Updated',
      detail: 'Risk updated successfully',
      life: 3000
    })

    emit('saved', returnedRisk.value!)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: `Failed to update risk: ${errorMessage}`,
      life: 3000
    })
  }
}
</script>
