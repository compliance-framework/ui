<template>
  <form @submit.prevent="createComponent()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new component</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="component.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <FormInput v-model="component.type" placeholder="e.g., service, software, hardware" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
      <FormInput v-model="component.title" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="component.description" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Purpose <span class="text-red-500">*</span></label>
      <FormTextarea v-model="component.purpose" required />
    </div>

    <!-- Temporarily disabled - these fields don't exist in current DB schema
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <FormTextarea 
        v-model="component.props" 
        placeholder="Additional properties (JSON format)"
        rows="3"
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <FormTextarea 
        v-model="component.links" 
        placeholder="External links (JSON format)"
        rows="3"
      />
    </div>
    -->

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
    <PrimaryButton type="submit">Create Component</PrimaryButton>
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
import { useToast } from 'primevue/usetoast'

const componentDefinitionStore = useComponentDefinitionStore()
const toast = useToast()

const props = defineProps<{
  componentDefinitionId: string
}>()

const emit = defineEmits<{
  created: [component: any]
}>()

const component = ref({
  uuid: uuidv4(),
  type: '',
  title: '',
  description: '',
  purpose: '',
  // props: '',
  // links: '',
  // responsibleRoles: [],
  // protocols: [],
  // controlImplementations: [],
})

const errorMessage = ref('')

async function createComponent(): Promise<void> {
  errorMessage.value = ''
  
  if (!props.componentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing'
    return
  }
  
  if (!component.value.type?.trim() || !component.value.title?.trim() || 
      !component.value.description?.trim() || !component.value.purpose?.trim()) {
    errorMessage.value = 'All required fields must be filled'
    return
  }
  
  try {
    // Only include fields that the backend supports for creation
    const componentData = {
      uuid: component.value.uuid,
      type: component.value.type,
      title: component.value.title,
      description: component.value.description,
      purpose: component.value.purpose,
      props: [], // Required by TypeScript interface but not stored in DB
      links: [], // Required by TypeScript interface but not stored in DB
      // Skip responsibleRoles, protocols, controlImplementations - they don't exist in DB schema
    }
    
    const response = await componentDefinitionStore.createComponent(
      props.componentDefinitionId,
      componentData
    )
    emit('created', response.data)
  } catch (error) {
    const errorText = error instanceof Error ? error.message : 'Failed to create component'
    toast.add({
      severity: 'error',
      summary: 'Error creating component',
      detail: errorText,
      life: 3000
    })
    errorMessage.value = errorText
  }
}

function generateUuid() {
  component.value.uuid = uuidv4()
}
</script>