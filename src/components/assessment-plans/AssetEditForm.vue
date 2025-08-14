<template>
  <form @submit.prevent="updateAsset()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit asset (WIP)</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ assetData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="assetData.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="assetData.description" rows="3" required />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Asset</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type AssessmentAsset } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
  asset: AssessmentAsset
}>()

const emit = defineEmits<{
  updated: [asset: AssessmentAsset]
  cancel: []
}>()

const assetData = ref<AssessmentAsset>(props.asset)

const errorMessage = ref('')

async function updateAsset(): Promise<void> {
  errorMessage.value = ''

  try {
    // TODO: fix the endpoints to be OSCAL compatable

    // // Get current assets, find and update the specific asset
    // const response = await assessmentPlanStore.get(props.assessmentPlanId)
    // let assets = response.data.assessmentAssets || []
    // assets = assets.map((asset: AssessmentAsset) => {
    //   if (asset.uuid == assetData.value.uuid) {
    //     return assetData.value
    //   }
    //   return asset
    // })

    // toast.add({
    //   severity: 'success',
    //   summary: 'Asset Updated',
    //   detail: 'Asset has been updated successfully',
    //   life: 3000
    // })

    emit('updated', assetData.value)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Asset',
      detail: error instanceof Error ? error.message : 'Failed to update asset',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update asset'
  }
}
</script>
