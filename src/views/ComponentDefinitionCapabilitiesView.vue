<template>
  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700">
    <div v-if="capabilities.length > 0">
      <ComponentDefinitionCapability 
        v-for="capability in capabilities" 
        :key="capability.uuid" 
        :capability="capability"
        :componentDefinitionId="componentDefinitionId"
      />
    </div>
    <div v-else class="p-8 text-center">
      <p class="text-gray-500 dark:text-slate-400 mb-4">No capabilities defined yet.</p>
      <TertiaryButton @click="showCreateForm = true">Add Capability</TertiaryButton>
    </div>
  </div>

  <div class="mt-4" v-if="capabilities.length > 0">
    <TertiaryButton @click="showCreateForm = true">Add Capability</TertiaryButton>
  </div>

  <!-- TODO: Add Capability Creation Modal -->
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'
import TertiaryButton from '@/components/TertiaryButton.vue'
import ComponentDefinitionCapability from '@/components/component-definitions/ComponentDefinitionCapability.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const capabilities = ref<any[]>([])
const route = useRoute()
const componentDefinitionId = ref<string>(route.params.id as string)
const showCreateForm = ref<boolean>(false)

onMounted(async () => {
  try {
    const response = await componentDefinitionStore.getCapabilities(componentDefinitionId.value)
    capabilities.value = response.data
  } catch (error) {
    console.error('Failed to load capabilities:', error)
  }
})
</script>