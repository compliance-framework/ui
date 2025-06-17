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
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="capability.remarks" />
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

const emit = defineEmits({
  created(capability: any) {
    return !!capability.uuid
  },
})

const capability = ref({
  uuid: uuidv4(),
  name: '',
  description: '',
  remarks: '',
})

const errorMessage = ref('')

async function createCapability(): Promise<void> {
  errorMessage.value = ''
  
  if (!capability.value.name || !capability.value.description) {
    errorMessage.value = 'Name and description are required'
    return
  }
  
  try {
    const response = await componentDefinitionStore.createCapability(
      props.componentDefinitionId,
      capability.value
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