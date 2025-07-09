<template>
  <form @submit.prevent="updateActivity()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit activity</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ activityData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="activityData.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="activityData.description" rows="3" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="activityData.remarks" rows="2" />
    </div>

    <!-- Properties Section -->
    <PropertyManager v-model="activityData.props" />

    <!-- Links Section -->
    <LinkManager v-model="activityData.links" />

    <!-- Responsible Roles Section -->
    <ResponsibleRoleManager v-model="activityData.responsibleRoles" />

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Activity</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { type Activity, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PropertyManager from '@/components/forms/PropertyManager.vue'
import LinkManager from '@/components/forms/LinkManager.vue'
import ResponsibleRoleManager from '@/components/forms/ResponsibleRoleManager.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
  activity: Activity
}>()

const emit = defineEmits<{
  updated: [activity: Activity]
  cancel: []
}>()

const activityData = ref<Activity>({
  uuid: '',
  title: '',
  description: '',
  remarks: '',
  props: [],
  links: [],
  responsibleRoles: []
})

const errorMessage = ref('')

onMounted(() => {
  if (props.activity) {
    activityData.value = {
      uuid: props.activity.uuid,
      title: props.activity.title || '',
      description: props.activity.description || '',
      remarks: props.activity.remarks || '',
      props: props.activity.props || [],
      links: props.activity.links || [],
      responsibleRoles: props.activity.responsibleRoles || []
    }

    console.log('ActivityEditForm: Activity received:', props.activity)
  }
})

async function updateActivity(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!activityData.value.uuid) {
    errorMessage.value = 'Activity UUID is missing'
    return
  }

  if (!activityData.value.description?.trim()) {
    errorMessage.value = 'Description is required'
    return
  }

  try {
    // Create the updated activity data, preserving the original activity structure
    const updatedActivityData = {
      ...props.activity,  // Preserve all original activity fields
      title: activityData.value.title || undefined,
      description: activityData.value.description,
      remarks: activityData.value.remarks || undefined,
      props: activityData.value.props || [],
      links: activityData.value.links || [],
      responsibleRoles: activityData.value.responsibleRoles || []
    }

    console.log('Updating activity with data:', updatedActivityData)
    console.log('Assessment plan ID:', props.assessmentPlanId)

    const result = await assessmentPlanStore.updateActivity(props.assessmentPlanId, updatedActivityData)
    console.log('Update result:', result)

    toast.add({
      severity: 'success',
      summary: 'Activity Updated',
      detail: 'Activity has been updated successfully',
      life: 3000
    })

    emit('updated', updatedActivityData)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Activity',
      detail: error instanceof Error ? error.message : 'Failed to update activity',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update activity'
  }
}
</script>
