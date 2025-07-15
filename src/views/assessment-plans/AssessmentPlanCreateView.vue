<template>
  <PageHeader>New Assessment Plan</PageHeader>
  <PageSubHeader>Create a new Assessment Plan</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="assessmentPlan.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="assessmentPlan.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Version</label>
        <FormInput v-model="assessmentPlan.metadata.version" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="assessmentPlan.metadata.remarks" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Import SSP URL <span class="text-red-500">*</span></label>
        <FormInput
          v-model="assessmentPlan.importSsp.href"
          placeholder="https://example.com/ssp.json"
          required
        />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Import SSP Remarks</label>
        <FormTextarea v-model="assessmentPlan.importSsp.remarks" />
      </div>
      <div class="text-right">
        <PrimaryButton
          type="submit"
        >
          Create Assessment Plan
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type AssessmentPlan, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRouter } from 'vue-router'
import TertiaryButton from '@/components/TertiaryButton.vue'
import PageCard from '@/components/PageCard.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from 'primevue/usetoast'

const assessmentPlanStore = useAssessmentPlanStore()
const assessmentPlan = ref<AssessmentPlan>({
  metadata: {
    title: '',
    version: '1.0',
    remarks: ''
  },
  importSsp: {
    href: '',
    remarks: ''
  }
} as AssessmentPlan)

const router = useRouter()
const toast = useToast()

async function submit() {
  try {
    // Validate required fields
    if (!assessmentPlan.value.metadata.title) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Title is required',
        life: 3000
      })
      return
    }

    if (!assessmentPlan.value.importSsp.href) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Import SSP URL is required',
        life: 3000
      })
      return
    }

    // Validate URL format
    try {
      new URL(assessmentPlan.value.importSsp.href)
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Import SSP URL must be a valid URL',
        life: 3000
      })
      return
    }

    const response = await assessmentPlanStore.create(assessmentPlan.value)

    toast.add({
      severity: 'success',
      summary: 'Assessment Plan Created',
      detail: 'Assessment plan created successfully',
      life: 3000
    })

    await router.push({
      name: 'assessment-plan-overview',
      params: { id: response.data.uuid },
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error creating assessment plan',
      detail: 'Failed to create assessment plan. Please check your input and try again.',
      life: 3000
    })
  }
}

function generateUuid() {
  assessmentPlan.value.uuid = uuidv4()
}
</script>
