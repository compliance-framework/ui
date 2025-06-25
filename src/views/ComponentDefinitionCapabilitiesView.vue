<template>
  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700">
    <div v-if="capabilities.length > 0">
      <ComponentDefinitionCapability 
        v-for="capability in capabilities" 
        :key="capability.uuid" 
        :capability="capability"
        :componentDefinitionId="componentDefinitionId"
        @edit="editCapability"
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

  <CapabilityCreateModal 
    @created="capabilityCreated" 
    :component-definition-id="componentDefinitionId" 
    v-model="showCreateForm" 
  />
  
  <CapabilityEditModal 
    v-if="editingCapability"
    @updated="capabilityUpdated" 
    :component-definition-id="componentDefinitionId"
    :capability="editingCapability"
    v-model="showEditForm" 
  />
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import TertiaryButton from '@/components/TertiaryButton.vue'
import ComponentDefinitionCapability from '@/components/component-definitions/ComponentDefinitionCapability.vue'
import CapabilityCreateModal from '@/components/component-definitions/CapabilityCreateModal.vue'
import CapabilityEditModal from '@/components/component-definitions/CapabilityEditModal.vue'

const componentDefinitionStore = useComponentDefinitionStore()
const toast = useToast()
const capabilities = ref<any[]>([])
const route = useRoute()
const componentDefinitionId = computed(() => route.params.id as string)
const showCreateForm = ref<boolean>(false)
const showEditForm = ref<boolean>(false)
const editingCapability = ref<any>(null)

onMounted(async () => {
  await loadCapabilities()
})

async function loadCapabilities() {
  try {
    const response = await componentDefinitionStore.getCapabilities(componentDefinitionId.value)
    capabilities.value = response.data
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Loading Capabilities',
      detail: 'Failed to load capabilities for this component definition',
      life: 3000
    })
  }
}

function capabilityCreated(capability: any) {
  capabilities.value.push(capability)
  showCreateForm.value = false
}

function editCapability(capability: any) {
  editingCapability.value = {
    ...capability,
    componentDefinitionId: componentDefinitionId.value
  }
  showEditForm.value = true
}

function capabilityUpdated(updatedCapability: any) {
  const index = capabilities.value.findIndex(c => c.uuid === updatedCapability.uuid)
  if (index !== -1) {
    capabilities.value[index] = updatedCapability
  }
  showEditForm.value = false
  editingCapability.value = null
}
</script>