<template>
  <form @submit.prevent="createCapability()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new capability</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="capability.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Name <span class="text-red-500">*</span></label>
      <FormInput v-model="capability.name" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="capability.description" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <FormTextarea 
        v-model="capability.props" 
        placeholder="Additional properties (JSON format)"
        rows="3"
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <FormTextarea 
        v-model="capability.links" 
        placeholder="External links (JSON format)"
        rows="3"
      />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
    <PrimaryButton type="submit">Create Capability</PrimaryButton>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'

const componentDefinitionStore = useComponentDefinitionStore()

const props = defineProps<{
  componentDefinitionId: string
}>()

const emit = defineEmits<{
  created: [capability: any]
}>()

const capability = ref({
  uuid: uuidv4(),
  name: '',
  description: '',
  props: '',
  links: '',
  incorporatesComponents: [],
  controlImplementations: [],
})

const errorMessage = ref('')

async function createCapability(): Promise<void> {
  errorMessage.value = ''
  
  if (!capability.value.name?.trim() || !capability.value.description?.trim()) {
    errorMessage.value = 'Name and description are required'
    return
  }
  
  try {
    // Parse JSON strings to arrays or use empty arrays if parsing fails
    let props = []
    let links = []
    
    if (capability.value.props?.trim()) {
      try {
        props = JSON.parse(capability.value.props)
      } catch (e) {
        console.warn('Invalid props JSON, using empty array')
      }
    }
    
    if (capability.value.links?.trim()) {
      try {
        links = JSON.parse(capability.value.links)
      } catch (e) {
        console.warn('Invalid links JSON, using empty array')
      }
    }
    
    const capabilityData = {
      ...capability.value,
      props,
      links,
    }
    
    const response = await componentDefinitionStore.createCapability(
      props.componentDefinitionId,
      capabilityData
    )
    emit('created', response.data)
  } catch (error) {
    console.error('Failed to create capability:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create capability'
  }
}

function generateUuid() {
  capability.value.uuid = uuidv4()
}
</script>