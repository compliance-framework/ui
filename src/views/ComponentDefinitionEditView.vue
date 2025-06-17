<template>
  <PageHeader>Edit Component Definition</PageHeader>
  <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit" v-if="componentDefinition.metadata">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <FormInput v-model="componentDefinition.uuid" disabled class="bg-gray-100 dark:bg-slate-800" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="componentDefinition.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="componentDefinition.metadata.remarks" />
      </div>
      <div class="text-right">
        <SecondaryButton
          type="button"
          @click="cancel"
          class="mr-2"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="submit"
        >
          Update Component Definition
        </PrimaryButton>
      </div>
    </form>
    
    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading component definition...</p>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type ComponentDefinition, useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRouter, useRoute } from 'vue-router'
import PageCard from '@/components/PageCard.vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const componentDefinition = ref<ComponentDefinition>({} as ComponentDefinition)
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  const id = route.params.id as string
  try {
    const response = await componentDefinitionStore.get(id)
    componentDefinition.value = response.data
  } catch (error) {
    console.error('Failed to load component definition:', error)
  }
})

async function submit() {
  try {
    const id = route.params.id as string
    await componentDefinitionStore.update(id, componentDefinition.value)
    await router.push({
      name: 'component-definition-view',
      params: { id: componentDefinition.value.uuid },
    })
  } catch (error) {
    console.error('Failed to update component definition:', error)
  }
}

function cancel() {
  router.push({
    name: 'component-definition-view',
    params: { id: route.params.id },
  })
}
</script>