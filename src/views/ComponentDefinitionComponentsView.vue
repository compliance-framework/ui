<template>
  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700">
    <div v-if="components.length > 0">
      <ComponentDefinitionComponent 
        v-for="component in components" 
        :key="component.uuid" 
        :component="component"
        :componentDefinitionId="componentDefinitionId"
        @edit="editComponent"
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

  <ComponentCreateModal 
    @created="componentCreated" 
    :component-definition-id="componentDefinitionId" 
    v-model="showCreateForm" 
  />
  
  <ComponentEditModal 
    v-if="editingComponent"
    @updated="componentUpdated" 
    :component-definition-id="componentDefinitionId"
    :component="editingComponent"
    v-model="showEditForm" 
  />
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import TertiaryButton from '@/components/TertiaryButton.vue'
import ComponentDefinitionComponent from '@/components/component-definitions/ComponentDefinitionComponent.vue'
import ComponentCreateModal from '@/components/component-definitions/ComponentCreateModal.vue'
import ComponentEditModal from '@/components/component-definitions/ComponentEditModal.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const toast = useToast()
const components = ref<any[]>([])
const route = useRoute()
const componentDefinitionId = computed(() => route.params.id as string)
const showCreateForm = ref<boolean>(false)
const showEditForm = ref<boolean>(false)
const editingComponent = ref<any>(null)

onMounted(async () => {
  await loadComponents()
})

async function loadComponents() {
  try {
    const response = await componentDefinitionStore.getComponents(componentDefinitionId.value)
    components.value = response.data || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Loading Components',
      detail: 'Failed to load components for this component definition',
      life: 3000
    })
    components.value = []
  }
}

function componentCreated(component: any) {
  components.value.push(component)
  showCreateForm.value = false
}

function editComponent(component: any) {
  editingComponent.value = {
    ...component,
    componentDefinitionId: componentDefinitionId.value
  }
  showEditForm.value = true
}

function componentUpdated(updatedComponent: any) {
  const index = components.value.findIndex(c => c.uuid === updatedComponent.uuid)
  if (index !== -1) {
    components.value[index] = updatedComponent
  }
  showEditForm.value = false
  editingComponent.value = null
}
</script>