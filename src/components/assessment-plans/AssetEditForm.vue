<template>
  <form @submit.prevent="updateAsset()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit asset</h1>

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

    <!-- Properties Section -->
    <PropertyManager v-model="assetData.props" />

    <!-- Links Section -->
    <LinkManager v-model="assetData.links" />

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
import { ref, onMounted } from 'vue'
import { type AssessmentAsset, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PropertyManager from '@/components/forms/PropertyManager.vue'
import LinkManager from '@/components/forms/LinkManager.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
  asset: AssessmentAsset
}>()

const emit = defineEmits<{
  updated: [asset: AssessmentAsset]
  cancel: []
}>()

const assetData = ref<AssessmentAsset>({
  uuid: '',
  title: '',
  description: '',
  props: [],
  links: [],
  components: []
})

const errorMessage = ref('')

onMounted(() => {
  if (props.asset) {
    assetData.value = {
      uuid: props.asset.uuid,
      title: props.asset.title || '',
      description: props.asset.description || '',
      props: props.asset.props || [],
      links: props.asset.links || [],
      components: props.asset.components || []
    }
  }
})

async function updateAsset(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!assetData.value.uuid) {
    errorMessage.value = 'Asset UUID is missing'
    return
  }

  if (!assetData.value.description?.trim()) {
    errorMessage.value = 'Description is required'
    return
  }

  try {
    const updatedAssetData = {
      uuid: assetData.value.uuid,
      title: assetData.value.title || '',
      description: assetData.value.description,
      props: assetData.value.props || [],
      links: assetData.value.links || [],
      components: assetData.value.components || []
    }

    // Get current assets, find and update the specific asset
    const response = await assessmentPlanStore.get(props.assessmentPlanId)
    const currentAssets = response.data.assessmentAssets || []
    const assetIndex = currentAssets.findIndex(a => a.uuid === assetData.value.uuid)

    if (assetIndex === -1) {
      errorMessage.value = 'Asset not found'
      return
    }

    const updatedAssets = [...currentAssets]
    updatedAssets[assetIndex] = updatedAssetData

    await assessmentPlanStore.updateAssessmentAssets(props.assessmentPlanId, updatedAssets)

    toast.add({
      severity: 'success',
      summary: 'Asset Updated',
      detail: 'Asset has been updated successfully',
      life: 3000
    })

    emit('updated', updatedAssetData)
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
