<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Create Finding
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
          placeholder="Enter finding title"
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
          placeholder="Enter finding description"
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
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Target (JSON) <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.target"
          required
          rows="6"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300 placeholder:text-gray-400 placeholder:italic"
          placeholder='{
  "type": "component",
  "target-id": "component-001",
  "title": "Example Component",
  "description": "Component description",
  "status": {
    "state": "implemented"
  }
}'
        ></textarea>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Required fields: type, target-id, status. Optional: title, description, implementation-status, remarks
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Implementation Status (JSON)
        </label>
        <textarea
          v-model="formData.implementationStatus"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300 placeholder:text-gray-400 placeholder:italic"
          placeholder='{
  "state": "implemented"
}'
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Related Observations
        </label>
        <div class="space-y-2">
          <div v-for="(observation, index) in formData.relatedObservations" :key="index" class="flex gap-2">
            <input
              v-model="formData.relatedObservations[index].observationUuid"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Enter observation UUID"
            />
            <button
              type="button"
              @click="removeRelatedObservation(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addRelatedObservation"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Related Observation
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Related Risks
        </label>
        <div class="space-y-2">
          <div v-for="(risk, index) in formData.relatedRisks" :key="index" class="flex gap-2">
            <input
              v-model="formData.relatedRisks[index].riskUuid"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Enter risk UUID"
            />
            <button
              type="button"
              @click="removeRelatedRisk(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addRelatedRisk"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Related Risk
          </button>
        </div>
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
          :disabled="!formData.title || !formData.description || !formData.target || !formData.status || saving"
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
import { type Finding, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
}>()

const emit = defineEmits<{
  cancel: []
  created: [finding: Finding]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const saving = ref(false)

const formData = reactive({
  title: '',
  description: '',
  status: '',
  target: '',
  implementationStatus: '',
  relatedObservations: [] as { observationUuid: string }[],
  relatedRisks: [] as { riskUuid: string }[],
  remarks: ''
})

function addRelatedObservation() {
  formData.relatedObservations.push({ observationUuid: '' })
}

function removeRelatedObservation(index: number) {
  formData.relatedObservations.splice(index, 1)
}

function addRelatedRisk() {
  formData.relatedRisks.push({ riskUuid: '' })
}

function removeRelatedRisk(index: number) {
  formData.relatedRisks.splice(index, 1)
}

function parseJsonField(value: string): any {
  if (!value.trim()) return undefined
  try {
    return JSON.parse(value)
  } catch (e) {
    return undefined
  }
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

  if (!formData.status) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Status is required',
      life: 3000
    })
    return
  }

  if (!formData.target) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Target is required',
      life: 3000
    })
    return
  }

  try {
    saving.value = true
    
    const newFinding: Partial<Finding> = {
      uuid: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      status: { state: formData.status },
      target: parseJsonField(formData.target),
      implementationStatus: parseJsonField(formData.implementationStatus),
      relatedObservations: formData.relatedObservations.filter(o => o.observationUuid.trim()).length > 0 ? formData.relatedObservations.filter(o => o.observationUuid.trim()).map(o => ({ observationUuid: o.observationUuid })) : undefined,
      relatedRisks: formData.relatedRisks.filter(r => r.riskUuid.trim()).length > 0 ? formData.relatedRisks.filter(r => r.riskUuid.trim()).map(r => ({ riskUuid: r.riskUuid })) : undefined,
      remarks: formData.remarks || undefined
    }
    
    console.log('Sending finding payload:', newFinding)
    console.log('Finding payload JSON:', JSON.stringify(newFinding, null, 2))
    
    const response = await poamStore.createFinding(props.poamId, newFinding)
    
    toast.add({
      severity: 'success',
      summary: 'Finding Created',
      detail: 'Finding created successfully',
      life: 3000
    })
    
    emit('created', response.data)
  } catch (error) {
    console.error('Error creating finding:', error)
    
    let errorMessage = 'Failed to create finding. Please try again.'
    
    if (error instanceof Response) {
      console.log('Response status:', error.status)
      console.log('Response statusText:', error.statusText)
      
      try {
        const errorData = await error.json()
        console.log('Error response data:', errorData)
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage
      } catch (e) {
        console.log('Could not parse error response as JSON:', e)
        errorMessage = `HTTP ${error.status}: ${error.statusText}`
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    
    toast.add({
      severity: 'error',
      summary: 'Creation Failed',
      detail: errorMessage,
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script> 