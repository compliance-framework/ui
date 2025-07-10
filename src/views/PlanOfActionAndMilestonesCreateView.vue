<template>
  <PageHeader>New Plan of Action and Milestones</PageHeader>
  <PageSubHeader>Create a new Plan of Action and Milestones</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="poam.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="poam.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Version</label>
        <FormInput v-model="poam.metadata.version" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="poam.metadata.remarks" />
      </div>
      <div class="text-right">
        <PrimaryButton
          type="submit"
        >
          Create Plan of Action and Milestones
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type PlanOfActionAndMilestones, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useRouter } from 'vue-router'
import TertiaryButton from '@/components/TertiaryButton.vue'
import PageCard from '@/components/PageCard.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from 'primevue/usetoast'

const poamStore = usePlanOfActionAndMilestonesStore()
const poam = ref<PlanOfActionAndMilestones>({
  uuid: '',
  metadata: {
    title: '',
    version: '',
    remarks: ''
  },
  poamItems: []
} as PlanOfActionAndMilestones)

const router = useRouter()
const toast = useToast()

async function submit() {
  try {
    const response = await poamStore.create(poam.value)
    await router.push({
      name: 'plan-of-action-and-milestones-overview',
      params: { id: response.data.uuid },
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error creating POAM',
      detail: 'Failed to create Plan of Action and Milestones. Please check your input and try again.',
      life: 3000
    })
  }
}

function generateUuid() {
  poam.value.uuid = uuidv4()
}
</script> 