<template>
  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700">
    <div v-if="components.length > 0">
      <ComponentDefinitionComponent 
        v-for="component in components" 
        :key="component.uuid" 
        :component="component"
        :componentDefinitionId="componentDefinitionId"
      />
    </div>
    <div v-else class="p-8 text-center">
      <p class="text-gray-500 dark:text-slate-400 mb-4">No components defined yet.</p>
      <TertiaryButton @click="showCreateForm = true">Add Component</TertiaryButton>
    </div>
  </div>

  <div class="mt-4" v-if="components.length > 0">
    <TertiaryButton @click="showCreateForm = true">Add Component</TertiaryButton>
  </div>

  <!-- TODO: Add Component Creation Modal -->
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'
import TertiaryButton from '@/components/TertiaryButton.vue'
import ComponentDefinitionComponent from '@/components/component-definitions/ComponentDefinitionComponent.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const components = ref<any[]>([])
const route = useRoute()
const componentDefinitionId = ref<string>(route.params.id as string)
const showCreateForm = ref<boolean>(false)

onMounted(async () => {
  try {
    const response = await componentDefinitionStore.getComponents(componentDefinitionId.value)
    components.value = response.data
  } catch (error) {
    console.error('Failed to load components:', error)
  }
})
</script>