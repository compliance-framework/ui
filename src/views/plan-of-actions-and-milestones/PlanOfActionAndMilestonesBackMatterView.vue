<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Back Matter</h2>
      <div class="flex items-center gap-3">
        <div class="text-sm text-gray-500 dark:text-slate-400">
          {{ resources.length }} resource{{ resources.length !== 1 ? 's' : '' }}
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Add Resource
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading back matter...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading back matter: {{ error }}</p>
    </div>

    <div v-else-if="!resources.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No resources found in back matter.</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add First Resource
      </button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="resource in resources"
        :key="resource.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <CollapsableGroup>
          <template #header="{ isOpen }">
            <div class="flex justify-between items-center p-6">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <svg 
                    class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform duration-200"
                    :class="{ 'rotate-90': isOpen }"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">
                    {{ resource.title || 'Untitled Resource' }}
                  </h3>
                </div>
                <p v-if="resource.description" class="text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {{ resource.description }}
                </p>
                
                <div class="mt-3 flex flex-wrap gap-2">
                  <span v-if="resource.documentIds?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {{ resource.documentIds.length }} Document ID{{ resource.documentIds.length !== 1 ? 's' : '' }}
                  </span>
                  <span v-if="resource.rlinks?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {{ resource.rlinks.length }} Link{{ resource.rlinks.length !== 1 ? 's' : '' }}
                  </span>
                  <span v-if="resource.props?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {{ resource.props.length }} Propert{{ resource.props.length === 1 ? 'y' : 'ies' }}
                  </span>
                  <span v-if="resource.base64?.value" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    Embedded Content
                  </span>
                </div>
              </div>
              
              <div class="ml-4 flex gap-2">
                <button
                  @click.stop="editResource(resource)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Edit
                </button>
                <button
                  @click.stop="deleteResource(resource.uuid)"
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </template>
          
          <div class="px-6 pb-6">
            <BackMatterResourceDetails :resource="resource" />
          </div>
        </CollapsableGroup>
      </div>
    </div>

    <!-- Create/Edit Resource Modal -->
    <Modal :show="showCreateModal || showEditModal" @close="closeModal" size="lg">
      <BackMatterResourceForm
        v-if="showCreateModal || showEditModal"
        :poam-id="route.params.id as string"
        :resource="editingResource"
        :is-edit="showEditModal"
        @cancel="closeModal"
        @saved="handleResourceSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { type BackMatter, type Resource, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import BackMatterResourceForm from '@/components/poam/BackMatterResourceForm.vue'
import BackMatterResourceDetails from '@/components/poam/BackMatterResourceDetails.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const backMatter = ref<BackMatter | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingResource = ref<Resource | null>(null)

const resources = computed(() => {
  return backMatter.value?.resources || []
})

onMounted(async () => {
  await loadBackMatter()
})

async function loadBackMatter() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getBackMatter(id)
    backMatter.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load back matter: ${errorMessage}`,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

function editResource(resource: Resource) {
  editingResource.value = { ...resource }
  showEditModal.value = true
}

async function deleteResource(resourceId: string) {
  if (!confirm('Are you sure you want to delete this resource?')) {
    return
  }

  try {
    const id = route.params.id as string
    await poamStore.deleteBackMatterResource(id, resourceId)
    
    toast.add({
      severity: 'success',
      summary: 'Resource Deleted',
      detail: 'Back matter resource deleted successfully',
      life: 3000
    })
    
    await loadBackMatter() // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete resource: ${errorMessage}`,
      life: 3000
    })
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingResource.value = null
}

function handleResourceSaved(savedResource: Resource) {
  if (showEditModal.value) {
    // Update existing resource in the list
    const index = resources.value.findIndex(r => r.uuid === savedResource.uuid)
    if (index !== -1) {
      resources.value[index] = savedResource
    }
  } else {
    // Add new resource to the list
    if (!backMatter.value) {
      backMatter.value = { resources: [] }
    }
    if (!backMatter.value.resources) {
      backMatter.value.resources = []
    }
    backMatter.value.resources.push(savedResource)
  }
  
  closeModal()
  
  toast.add({
    severity: 'success',
    summary: 'Resource Saved',
    detail: showEditModal.value ? 'Resource updated successfully' : 'Resource created successfully',
    life: 3000
  })
}
</script> 