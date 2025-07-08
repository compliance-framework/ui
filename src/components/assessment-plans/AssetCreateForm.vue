<template>
  <form @submit.prevent="createAsset()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new asset</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="asset.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="asset.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="asset.description" rows="3" required />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Asset</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type Asset, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
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
  created: [asset: Asset]
  cancel: []
}>()

const asset = ref<Asset>({
  uuid: uuidv4(),
  title: '',
  description: '',
  components: []
})

const errorMessage = ref('')

async function createAsset(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!asset.value.description?.trim()) {
    errorMessage.value = 'Description is required'
    return
  }

  try {
    const assetData = {
      uuid: asset.value.uuid,
      title: asset.value.title || '',
      description: asset.value.description,
      components: asset.value.components || []
    }

    // Get current assets and add the new one
    const response = await assessmentPlanStore.get(props.assessmentPlanId)
    const currentAssets = response.data.assets || []
    const updatedAssets = [...currentAssets, assetData]

    await assessmentPlanStore.updateAssets(props.assessmentPlanId, updatedAssets)

    toast.add({
      severity: 'success',
      summary: 'Asset Created',
      detail: 'Asset has been created successfully',
      life: 3000
    })

    emit('created', assetData)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Asset',
      detail: error instanceof Error ? error.message : 'Failed to create asset',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create asset'
  }
}

function generateUuid() {
  asset.value.uuid = uuidv4()
}
</script>
