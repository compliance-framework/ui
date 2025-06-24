<template>
  <form @submit.prevent="updateCapability()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit capability</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ capabilityData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Name <span class="text-red-500">*</span></label>
      <FormInput v-model="capabilityData.name" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="capabilityData.description" required />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
    
    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Capability</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const componentDefinitionStore = useComponentDefinitionStore()

const props = defineProps<{
  componentDefinitionId: string
  capability: any
}>()

const emit = defineEmits<{
  updated: [capability: any]
  cancel: []
}>()

const capabilityData = ref({
  uuid: '',
  name: '',
  description: '',
})

const errorMessage = ref('')

onMounted(() => {
  if (props.capability) {
    capabilityData.value = {
      uuid: props.capability.uuid,
      name: props.capability.name || '',
      description: props.capability.description || '',
    }
  }
})

async function updateCapability(): Promise<void> {
  errorMessage.value = ''
  
  const actualComponentDefinitionId = props.componentDefinitionId || props.capability?.componentDefinitionId
  
  if (!actualComponentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing'
    return
  }
  
  if (!capabilityData.value.uuid) {
    errorMessage.value = 'Capability UUID is missing'
    return
  }
  
  if (!capabilityData.value.name?.trim() || !capabilityData.value.description?.trim()) {
    errorMessage.value = 'Name and description are required'
    return
  }
  
  try {
    // Only include fields that the backend supports for updates
    const updatedCapabilityData = {
      uuid: capabilityData.value.uuid,
      name: capabilityData.value.name,
      description: capabilityData.value.description,
      props: [], // Required by TypeScript interface but not stored in DB
      links: [], // Required by TypeScript interface but not stored in DB
    }
    
    const response = await componentDefinitionStore.updateCapability(
      actualComponentDefinitionId,
      capabilityData.value.uuid,
      updatedCapabilityData
    )
    emit('updated', response.data)
  } catch (error) {
    console.error('Failed to update capability:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update capability'
  }
}
</script>