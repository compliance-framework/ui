<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Edit Finding
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
          Target (JSON) <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.target"
          required
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder='{"type": "component", "componentId": "example", "title": "Component Name", "status": {"state": "implemented"}}'
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Status
        </label>
        <select
          v-model="formData.status"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">Select status</option>
          <option value="satisfied">Satisfied</option>
          <option value="not satisfied">Not Satisfied</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Implementation Status (JSON)
        </label>
        <textarea
          v-model="formData.implementationStatus"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder='{"state": "implemented"}'
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Related Observations
        </label>
        <div class="space-y-2">
          <div v-for="(observation, index) in formData.relatedObservations" :key="index" class="flex gap-2">
            <input
              v-model="formData.relatedObservations[index]"
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
              v-model="formData.relatedRisks[index]"
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
          :disabled="!formData.title || !formData.description || !formData.target || saving"
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
import type { Finding } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const props = defineProps<{
  poamId: string
  finding: Finding
}>()

const emit = defineEmits<{
  cancel: []
  saved: [finding: Finding]
}>()

const toast = useToast()

const { data: returnedFinding, isLoading: saving, execute: executeUpdate } = useDataApi<Finding>(
  `/api/oscal/plan-of-action-and-milestones/${props.poamId}/findings/${props.finding.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys]
  }
)

const formData = reactive({
  title: '',
  description: '',
  target: '',
  status: '',
  implementationStatus: '',
  relatedObservations: [] as string[],
  relatedRisks: [] as string[],
  remarks: ''
})

onMounted(() => {
  // Initialize form with existing data
  formData.title = props.finding.title || ''
  formData.description = props.finding.description
  formData.target = props.finding.target ? JSON.stringify(props.finding.target, null, 2) : ''
  formData.status = props.finding.status?.state || ''
  formData.implementationStatus = props.finding.implementationStatus ? JSON.stringify(props.finding.implementationStatus, null, 2) : ''
  // Handle related observations - extract UUIDs from objects
  formData.relatedObservations = props.finding.relatedObservations?.map((obs: any) => obs.observationUuid || obs) || []
  // Handle related risks - extract UUIDs from objects
  formData.relatedRisks = props.finding.relatedRisks?.map((risk: any) => risk.riskUuid || risk) || []
  formData.remarks = props.finding.remarks || ''
})

function addRelatedObservation() {
  formData.relatedObservations.push('')
}

function removeRelatedObservation(index: number) {
  formData.relatedObservations.splice(index, 1)
}

function addRelatedRisk() {
  formData.relatedRisks.push('')
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
    const updatedFinding: Finding = {
      ...props.finding,
      title: formData.title,
      description: formData.description,
      target: parseJsonField(formData.target),
      status: formData.status ? { state: formData.status } : undefined,
      implementationStatus: parseJsonField(formData.implementationStatus),
      relatedObservations: formData.relatedObservations.filter(o => o.trim()).length > 0 ? formData.relatedObservations.filter(o => o.trim()) : undefined,
      relatedRisks: formData.relatedRisks.filter(r => r.trim()).length > 0 ? formData.relatedRisks.filter(r => r.trim()) : undefined,
      remarks: formData.remarks || undefined
    }

    await executeUpdate({
      data: updatedFinding
    })

    toast.add({
      severity: 'success',
      summary: 'Finding Updated',
      detail: 'Finding updated successfully',
      life: 3000
    })

    emit('saved', returnedFinding.value!)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: `Failed to update finding: ${errorMessage}`,
      life: 3000
    })
  }
}
</script>
