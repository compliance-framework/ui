<template>
  <form @submit.prevent="updateSubject()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit subject</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ subjectData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="subjectData.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <select
        v-model="subjectData.type"
        required
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
      >
        <option value="">Select type...</option>
        <option value="component">Component</option>
        <option value="inventory-item">Inventory Item</option>
        <option value="location">Location</option>
        <option value="party">Party</option>
        <option value="user">User</option>
      </select>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="subjectData.description" rows="3" required />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Subject</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { type AssessmentSubject, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
  subject: AssessmentSubject
}>()

const emit = defineEmits<{
  updated: [subject: AssessmentSubject]
  cancel: []
}>()

const subjectData = ref<AssessmentSubject>({
  uuid: '',
  title: '',
  type: '',
  description: ''
})

const errorMessage = ref('')

onMounted(() => {
  if (props.subject) {
    subjectData.value = {
      uuid: props.subject.uuid,
      title: props.subject.title || '',
      type: props.subject.type || '',
      description: props.subject.description || ''
    }
  }
})

async function updateSubject(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!subjectData.value.uuid) {
    errorMessage.value = 'Subject UUID is missing'
    return
  }

  if (!subjectData.value.type?.trim() || !subjectData.value.description?.trim()) {
    errorMessage.value = 'Type and description are required'
    return
  }

  try {
    const updatedSubjectData = {
      uuid: subjectData.value.uuid,
      title: subjectData.value.title || '',
      type: subjectData.value.type,
      description: subjectData.value.description
    }

    // Get current subjects, find and update the specific subject
    const response = await assessmentPlanStore.get(props.assessmentPlanId)
    const currentSubjects = response.data.assessmentSubjects || []
    const subjectIndex = currentSubjects.findIndex(s => s.uuid === subjectData.value.uuid)

    if (subjectIndex === -1) {
      errorMessage.value = 'Subject not found'
      return
    }

    const updatedSubjects = [...currentSubjects]
    updatedSubjects[subjectIndex] = updatedSubjectData

    await assessmentPlanStore.updateAssessmentSubjects(props.assessmentPlanId, updatedSubjects)

    toast.add({
      severity: 'success',
      summary: 'Subject Updated',
      detail: 'Subject has been updated successfully',
      life: 3000
    })

    emit('updated', updatedSubjectData)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Subject',
      detail: error instanceof Error ? error.message : 'Failed to update subject',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update subject'
  }
}
</script>
