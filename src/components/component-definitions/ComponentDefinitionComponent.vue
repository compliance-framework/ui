<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-2 px-4 flex items-center gap-4">
        <span
          class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
        >{{ component.type }}</span>
        <div class="grow">
          {{ component.title }}
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1">Component</span>
        </div>
        <div class="flex gap-2">
          <TertiaryButton
            class="bg-white hover:bg-zinc-100 dark:bg-slate-800 dark:hover:bg-slate-600"
            @click.stop="viewDetails"
          >
            Details
          </TertiaryButton>
          <TertiaryButton
            class="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
            @click.stop="editComponent"
          >
            Edit
          </TertiaryButton>
        </div>
      </div>
    </template>
    
    <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
      <div class="flex items-start justify-between gap-4">
        <div class="grow">
          <div v-if="component.description" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Description</h4>
            <p class="text-gray-700 dark:text-slate-400">{{ component.description }}</p>
          </div>
          
          <div v-if="component.purpose" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Purpose</h4>
            <p class="text-gray-700 dark:text-slate-400">{{ component.purpose }}</p>
          </div>

          <div v-if="controlImplementations.length > 0" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Control Implementations</h4>
            <div class="space-y-2">
              <div 
                v-for="impl in controlImplementations" 
                :key="impl.uuid"
                class="bg-gray-50 dark:bg-slate-800 p-3 rounded-md"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-sm">{{ impl.source }}</p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">{{ impl.description }}</p>
                  </div>
                  <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                    {{ impl.implementedRequirements?.length || 0 }} requirements
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="rounded-md border dark:border-slate-700 min-w-48">
          <table class="table-auto w-full">
            <tbody>
              <tr>
                <td colspan="2" class="px-2 py-2 font-medium">Attributes</td>
              </tr>
              <tr class="border-t dark:border-slate-700">
                <td class="px-2 py-1">UUID</td>
                <td class="px-2 py-1 text-xs font-mono">{{ component.uuid }}</td>
              </tr>
              <tr class="border-t dark:border-slate-700">
                <td class="px-2 py-1">Type</td>
                <td class="px-2 py-1">{{ component.type }}</td>
              </tr>
              <tr class="border-t dark:border-slate-700" v-if="responsibleRoles.length > 0">
                <td class="px-2 py-1">Roles</td>
                <td class="px-2 py-1">{{ responsibleRoles.length }}</td>
              </tr>
              <tr class="border-t dark:border-slate-700" v-if="component.protocols?.length > 0">
                <td class="px-2 py-1">Protocols</td>
                <td class="px-2 py-1">{{ component.protocols.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </CollapsableGroup>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRouter } from 'vue-router'

const props = defineProps<{
  component: any
  componentDefinitionId: string
}>()

const componentDefinitionStore = useComponentDefinitionStore()
const controlImplementations = ref<any[]>([])
const responsibleRoles = ref<any[]>([])
const router = useRouter()

onMounted(async () => {
  try {
    // Load control implementations for this component
    const response = await componentDefinitionStore.getControlImplementations(
      props.componentDefinitionId, 
      props.component.uuid
    )
    controlImplementations.value = response.data
    
    // Load responsible roles (would be in the component data)
    responsibleRoles.value = props.component.responsibleRoles || []
  } catch (error) {
    console.error('Failed to load component details:', error)
  }
})

const emit = defineEmits<{
  edit: [component: any]
}>()

function viewDetails() {
  // Could navigate to a detailed component view or open a modal
  console.log('View details for component:', props.component.uuid)
}

function editComponent() {
  emit('edit', props.component)
}
</script>