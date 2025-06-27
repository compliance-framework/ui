<template>
  <form @submit.prevent="createResource()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create Back Matter Resource</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="resource.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
      <FormInput v-model="resource.title" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="resource.description" required rows="3" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="resource.remarks" rows="2" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Citation Text</label>
      <FormTextarea v-model="resource.citation!.text" placeholder="Reference or citation information" rows="2" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Resource Links</label>
      <div class="space-y-2">
        <div v-for="(link, index) in resource.rlinks" :key="index" class="flex gap-2">
          <FormInput 
            v-model="link.href" 
            placeholder="https://example.com/resource" 
            class="flex-1"
          />
          <FormInput 
            v-model="link.mediaType" 
            placeholder="application/pdf" 
            class="w-40"
          />
          <TertiaryButton type="button" @click="removeResourceLink(index)" class="px-2">
            Remove
          </TertiaryButton>
        </div>
        <TertiaryButton type="button" @click="addResourceLink" class="text-sm">
          Add Resource Link
        </TertiaryButton>
      </div>
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
    
    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Resource</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useComponentDefinitionStore, type BackMatterResource, type ResourceLink, type Citation } from '@/stores/component-definitions.ts'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
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
  created: [resource: BackMatterResource]
  cancel: []
}>()

const resource = ref<BackMatterResource>({
  uuid: uuidv4(),
  title: '',
  description: '',
  remarks: '',
  citation: {
    text: ''
  } as Citation,
  rlinks: []
})

const errorMessage = ref('')

async function createResource(): Promise<void> {
  errorMessage.value = ''
  
  if (!props.componentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing'
    return
  }
  
  if (!resource.value.title?.trim() || !resource.value.description?.trim()) {
    errorMessage.value = 'Title and description are required'
    return
  }
  
  try {
    const resourceData: any = {
      uuid: resource.value.uuid,
      title: resource.value.title.trim(),
      description: resource.value.description.trim()
    }
    if (resource.value.remarks?.trim()) {
      resourceData.remarks = resource.value.remarks.trim()
    }
    
    if (resource.value.citation?.text?.trim()) {
      resourceData.citation = {
        text: resource.value.citation.text.trim()
      }
    }
    
    const validLinks = resource.value.rlinks?.filter(link => link.href.trim())
    if (validLinks && validLinks.length > 0) {
      resourceData.rlinks = validLinks
    }
    
    const response = await componentDefinitionStore.createBackMatterResource(
      props.componentDefinitionId,
      resourceData
    )
    emit('created', response.data)
  } catch (error) {
    const errorText = error instanceof Error ? error.message : 'Failed to create back matter resource'
    toast.add({
      severity: 'error',
      summary: 'Error creating resource',
      detail: errorText,
      life: 3000
    })
    errorMessage.value = errorText
  }
}

function generateUuid() {
  resource.value.uuid = uuidv4()
}

function addResourceLink() {
  resource.value.rlinks = resource.value.rlinks || []
  resource.value.rlinks.push({
    href: '',
    mediaType: ''
  })
}

function removeResourceLink(index: number) {
  resource.value.rlinks?.splice(index, 1)
}
</script>