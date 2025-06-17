<template>
  <PageHeader>Component Definition</PageHeader>
  <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700 p-6"
  >
    <div v-if="componentDefinition.metadata">
      <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">Metadata</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
          <p class="text-gray-900 dark:text-slate-300">{{ componentDefinition.metadata.title }}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Version</label>
          <p class="text-gray-900 dark:text-slate-300">{{ componentDefinition.metadata.version || 'Not specified' }}</p>
        </div>
        
        <div v-if="componentDefinition.metadata.lastModified">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Last Modified</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(componentDefinition.metadata.lastModified) }}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">UUID</label>
          <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">{{ componentDefinition.uuid }}</p>
        </div>
      </div>

      <div v-if="componentDefinition.metadata.description" class="mb-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
        <p class="text-gray-900 dark:text-slate-300">{{ componentDefinition.metadata.description }}</p>
      </div>
    </div>

    <div v-if="!componentDefinition.metadata" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading component definition...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type ComponentDefinition, useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'

const componentDefinitionStore = useComponentDefinitionStore()
const componentDefinition = ref<ComponentDefinition>({} as ComponentDefinition)
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}
</script>