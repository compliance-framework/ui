<template>
  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700">
    <div v-if="backMatter && backMatter.resources?.length > 0" class="p-4">
      <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">Back Matter Resources</h3>
      <div class="space-y-4">
        <div 
          v-for="resource in backMatter.resources" 
          :key="resource.uuid"
          class="border dark:border-slate-700 rounded-md p-4"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="font-medium text-gray-900 dark:text-slate-300">{{ resource.title }}</p>
              <p class="text-sm text-gray-600 dark:text-slate-400" v-if="resource.description">{{ resource.description }}</p>
              <div class="mt-2 space-y-1">
                <p class="text-xs text-gray-500 dark:text-slate-500">UUID: {{ resource.uuid }}</p>
                <div v-if="resource.rlinks?.length > 0" class="flex flex-wrap gap-2">
                  <a 
                    v-for="link in resource.rlinks" 
                    :key="link.href"
                    :href="link.href"
                    target="_blank"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {{ link.href }}
                  </a>
                </div>
              </div>
            </div>
            <TertiaryButton @click="editResource(resource)">
              Edit
            </TertiaryButton>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="p-8 text-center">
      <p class="text-gray-500 dark:text-slate-400 mb-4">No back matter resources defined.</p>
      <TertiaryButton @click="showCreateForm = true">Add Resource</TertiaryButton>
    </div>
  </div>

  <div class="mt-4" v-if="backMatter && backMatter.resources?.length > 0">
    <TertiaryButton @click="showCreateForm = true">Add Resource</TertiaryButton>
  </div>

  <!-- TODO: Add Resource Creation Modal -->
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'
import TertiaryButton from '@/components/TertiaryButton.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const backMatter = ref<any>(null)
const route = useRoute()
const componentDefinitionId = ref<string>(route.params.id as string)
const showCreateForm = ref<boolean>(false)

onMounted(async () => {
  try {
    const response = await componentDefinitionStore.getBackMatter(componentDefinitionId.value)
    backMatter.value = response.data
  } catch (error) {
    console.error('Failed to load back matter:', error)
  }
})

function editResource(resource: any) {
  console.log('Edit resource:', resource)
}
</script>