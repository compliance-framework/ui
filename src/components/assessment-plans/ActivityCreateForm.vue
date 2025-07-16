<template>
  <form @submit.prevent="createActivity()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new activity</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="activity.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="activity.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="activity.description" rows="3" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="activity.remarks" rows="2" />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Activity</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type Activity, useActivityStore } from '@/stores/activities.ts'
import { type AssessmentPlan, type Task, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const activityStore = useActivityStore();
const toast = useToast()

const props = defineProps<{
  assessmentPlan: AssessmentPlan
  task: Task,
}>()

const emit = defineEmits<{
  created: [activity: Activity]
  cancel: []
}>()

const activity = ref<Activity>({} as Activity)

const errorMessage = ref('')

async function createActivity(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlan.uuid) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!activity.value.description?.trim()) {
    errorMessage.value = 'Description is required'
    return
  }

  try {
    const activityResult = await actitivityStore.create(activity.value)
    await assessmentPlanStore.associateActivity(props.assessmentPlan.uuid, props.task.uuid, activityResult.data.uuid)

    toast.add({
      severity: 'success',
      summary: 'Activity Created',
      detail: 'Activity has been created successfully',
      life: 3000
    })

    emit('created', activityResult.data)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Activity',
      detail: error instanceof Error ? error.message : 'Failed to create activity',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create activity'
  }
}

function generateUuid() {
  activity.value.uuid = uuidv4()
}
</script>
