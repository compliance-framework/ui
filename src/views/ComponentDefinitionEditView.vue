<template>
  <PageHeader>Component Definition Metadata</PageHeader>
  <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <div class="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
      <strong>Metadata Editing Disabled:</strong> Component definition metadata cannot be updated due to backend limitations. 
      The backend only supports updating import definitions, components, and capabilities through their respective sections.
    </div>
    
    <div v-if="componentDefinition.metadata" class="space-y-4">
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">ID</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border rounded-md">
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{ componentDefinition.uuid }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">Title</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border rounded-md">
          <span class="text-gray-900 dark:text-slate-300">{{ componentDefinition.metadata.title }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300">Remarks</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border rounded-md min-h-[60px]">
          <span class="text-gray-900 dark:text-slate-300">{{ componentDefinition.metadata.remarks || 'No remarks' }}</span>
        </div>
      </div>
      
      <div class="text-right">
        <SecondaryButton
          type="button"
          @click="cancel"
        >
          Back to Overview
        </SecondaryButton>
      </div>
    </div>
    
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

// Submit function removed - metadata editing is disabled

function cancel() {
  router.push({
    name: 'component-definition-overview',
    params: { id: route.params.id },
  })
}
</script>