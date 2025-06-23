<template>
  <form @submit.prevent="updateComponent()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit component</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ componentData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <FormInput v-model="componentData.type" placeholder="e.g., service, software, hardware" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
      <FormInput v-model="componentData.title" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="componentData.description" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Purpose <span class="text-red-500">*</span></label>
      <FormTextarea v-model="componentData.purpose" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <FormTextarea 
        v-model="componentData.props" 
        placeholder="Additional properties (JSON format)"
        rows="3"
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <FormTextarea 
        v-model="componentData.links" 
        placeholder="External links (JSON format)"
        rows="3"
      />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
    
    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Component</PrimaryButton>
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
  component: any
}>()

const emit = defineEmits<{
  updated: [component: any]
  cancel: []
}>()

const componentData = ref({
  uuid: '',
  type: '',
  title: '',
  description: '',
  purpose: '',
  props: '',
  links: '',
  responsibleRoles: [],
  protocols: [],
  controlImplementations: [],
})

const errorMessage = ref('')

onMounted(() => {
  if (props.component) {
    componentData.value = {
      uuid: props.component.uuid,
      type: props.component.type || '',
      title: props.component.title || '',
      description: props.component.description || '',
      purpose: props.component.purpose || '',
      props: JSON.stringify(props.component.props || [], null, 2),
      links: JSON.stringify(props.component.links || [], null, 2),
      responsibleRoles: props.component.responsibleRoles || [],
      protocols: props.component.protocols || [],
      controlImplementations: props.component.controlImplementations || [],
    }
  }
})

async function updateComponent(): Promise<void> {
  errorMessage.value = ''
  
  const actualComponentDefinitionId = props.componentDefinitionId || props.component?.componentDefinitionId
  
  if (!actualComponentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing'
    return
  }
  
  if (!componentData.value.uuid) {
    errorMessage.value = 'Component UUID is missing'
    return
  }
  
  if (!componentData.value.type?.trim() || !componentData.value.title?.trim() || 
      !componentData.value.description?.trim() || !componentData.value.purpose?.trim()) {
    errorMessage.value = 'All required fields must be filled'
    return
  }
  
  try {
    // Parse JSON strings to arrays or use empty arrays if parsing fails
    let props = []
    let links = []
    
    if (componentData.value.props?.trim()) {
      try {
        props = JSON.parse(componentData.value.props)
      } catch (e) {
        console.warn('Invalid props JSON, using empty array')
        props = []
      }
    }
    
    if (componentData.value.links?.trim()) {
      try {
        links = JSON.parse(componentData.value.links)
      } catch (e) {
        console.warn('Invalid links JSON, using empty array')
        links = []
      }
    }
    
    const updatedComponentData = {
      ...componentData.value,
      props,
      links,
      responsibleRoles: componentData.value.responsibleRoles || [],
      protocols: componentData.value.protocols || [],
      controlImplementations: componentData.value.controlImplementations || [],
    }
    
    const response = await componentDefinitionStore.updateComponent(
      actualComponentDefinitionId,
      componentData.value.uuid,
      updatedComponentData
    )
    emit('updated', response.data)
  } catch (error) {
    console.error('Failed to update component:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update component'
  }
}
</script>