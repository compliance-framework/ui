<template>
  <form @submit.prevent="createSubject()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new subject</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="subject.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="subject.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <select
        v-model="subject.type"
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
      <FormTextarea v-model="subject.description" rows="3" required />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Subject</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type Subject, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
}>()

const emit = defineEmits<{
  created: [subject: Subject]
  cancel: []
}>()

const subject = ref<Subject>({
  uuid: uuidv4(),
  title: '',
  type: '',
  description: ''
})

const errorMessage = ref('')

async function createSubject(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!subject.value.type?.trim() || !subject.value.description?.trim()) {
    errorMessage.value = 'Type and description are required'
    return
  }

  try {
    const subjectData = {
      uuid: subject.value.uuid,
      title: subject.value.title || '',
      type: subject.value.type,
      description: subject.value.description
    }

    // Get current subjects and add the new one
    const response = await assessmentPlanStore.get(props.assessmentPlanId)
    const currentSubjects = response.data.subjects || []
    const updatedSubjects = [...currentSubjects, subjectData]

    await assessmentPlanStore.updateSubjects(props.assessmentPlanId, updatedSubjects)

    toast.add({
      severity: 'success',
      summary: 'Subject Created',
      detail: 'Subject has been created successfully',
      life: 3000
    })

    emit('created', subjectData)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Subject',
      detail: error instanceof Error ? error.message : 'Failed to create subject',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create subject'
  }
}

function generateUuid() {
  subject.value.uuid = uuidv4()
}
</script>
