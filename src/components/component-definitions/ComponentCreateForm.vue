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

const componentDefinitionStore = useComponentDefinitionStore()

const props = defineProps<{
  componentDefinitionId: string
}>()

const emit = defineEmits({
  created(component: any) {
    return !!component.uuid
  },
})

const component = ref({
  uuid: uuidv4(),
  type: '',
  title: '',
  description: '',
  purpose: '',
})

const errorMessage = ref('')

async function createComponent(): Promise<void> {
  errorMessage.value = ''
  
  if (!component.value.type || !component.value.title || !component.value.description || !component.value.purpose) {
    errorMessage.value = 'All required fields must be filled'
    return
  }
  
  try {
    const response = await componentDefinitionStore.createComponent(
      props.componentDefinitionId,
      component.value
    )
    emit('created', response.data[0])
  } catch (error) {
    console.error('Failed to create component:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create component'
  }
}

function generateUuid() {
  component.value.uuid = uuidv4()
}
</script>