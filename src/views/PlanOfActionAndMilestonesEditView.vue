<template>
  <PageHeader>Edit Plan of Action and Milestones</PageHeader>
  <PageSubHeader>{{ planOfActionAndMilestones.metadata?.title }}</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">ID</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{ planOfActionAndMilestones.uuid }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">Title</label>
        <FormInput v-model="planOfActionAndMilestones.metadata.title" />
      </div>
      
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">Version</label>
        <FormInput v-model="planOfActionAndMilestones.metadata.version" />
      </div>
      
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="planOfActionAndMilestones.metadata.remarks" />
      </div>
      
      <div class="flex gap-4 justify-end">
        <SecondaryButton
          type="button"
          @click="cancel"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="submit"
        >
          Save Changes
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type PlanOfActionAndMilestones, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useRouter, useRoute } from 'vue-router'
import PageCard from '@/components/PageCard.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import { useToast } from 'primevue/usetoast'

const planOfActionAndMilestonesStore = usePlanOfActionAndMilestonesStore()
const planOfActionAndMilestones = ref<PlanOfActionAndMilestones>({} as PlanOfActionAndMilestones)
const router = useRouter()
const route = useRoute()
const toast = useToast()

onMounted(async () => {
  const id = route.params.id as string
  try {
    const response = await planOfActionAndMilestonesStore.get(id)
    planOfActionAndMilestones.value = response.data
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading POAM',
      detail: 'Failed to load Plan of Action and Milestones for editing. Please try again.',
      life: 3000
    })
  }
})

async function submit() {
  try {
    await planOfActionAndMilestonesStore.update(planOfActionAndMilestones.value.uuid, planOfActionAndMilestones.value)
    toast.add({
      severity: 'success',
      summary: 'POAM Updated',
      detail: 'Plan of Action and Milestones updated successfully',
      life: 3000
    })
    await router.push({
      name: 'plan-of-action-and-milestones-overview',
      params: { id: planOfActionAndMilestones.value.uuid },
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: 'Failed to update Plan of Action and Milestones. Please check your input and try again.',
      life: 3000
    })
  }
}

function cancel() {
  router.push({
    name: 'plan-of-action-and-milestones-overview',
    params: { id: route.params.id },
  })
}
</script> 