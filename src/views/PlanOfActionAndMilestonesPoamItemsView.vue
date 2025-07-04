<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">POAM Items</h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add POAM Item
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading POAM items...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading POAM items: {{ error }}</p>
    </div>

    <div v-else-if="!poamItems.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No POAM items found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in poamItems"
        :key="item.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ item.title }}</h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">{{ item.description }}</p>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-if="item.relatedFindings?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {{ item.relatedFindings.length }} Findings
              </span>
              <span v-if="item.relatedObservations?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {{ item.relatedObservations.length }} Observations
              </span>
              <span v-if="item.relatedRisks?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {{ item.relatedRisks.length }} Risks
              </span>
            </div>
          </div>
          
          <div class="ml-4 flex gap-2">
            <button
              @click="editItem(item)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="deleteItem(item.uuid || '')"
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <PoamItemCreateForm 
        :poam-id="route.params.id as string"
        @cancel="showCreateModal = false"
        @created="handleItemCreated"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal && editingItem !== null" @close="showEditModal = false" size="lg">
      <PoamItemEditForm 
        v-if="editingItem"
        :poam-id="route.params.id as string"
        :item="editingItem"
        @cancel="showEditModal = false"
        @saved="handleItemSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type PoamItem, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import PoamItemCreateForm from '@/components/poam/PoamItemCreateForm.vue'
import PoamItemEditForm from '@/components/poam/PoamItemEditForm.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const poamItems = ref<PoamItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)

// Edit targets
const editingItem = ref<PoamItem | null>(null)

onMounted(async () => {
  await loadPoamItems()
})

async function loadPoamItems() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getPoamItems(id)
    poamItems.value = response.data
  } catch (err) {
    console.error('Error loading POAM items:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

// Item management
const editItem = (item: PoamItem) => {
  editingItem.value = item
  showEditModal.value = true
}

const handleItemCreated = (newItem: PoamItem) => {
  poamItems.value.push(newItem)
  showCreateModal.value = false
}

const handleItemSaved = (updatedItem: PoamItem) => {
  const index = poamItems.value.findIndex(item => item.uuid === updatedItem.uuid)
  if (index !== -1) {
    poamItems.value[index] = updatedItem
  }
  showEditModal.value = false
  editingItem.value = null
}

async function deleteItem(uuid: string) {
  if (!uuid || !confirm('Are you sure you want to delete this POAM item?')) {
    return
  }

  try {
    const id = route.params.id as string
    await poamStore.deletePoamItem(id, uuid)
    
    toast.add({
      severity: 'success',
      summary: 'POAM Item Deleted',
      detail: 'POAM item deleted successfully',
      life: 3000
    })
    
    await loadPoamItems() // Reload the list
  } catch (err) {
    console.error('Error deleting POAM item:', err)
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err instanceof Error ? err.message : 'Failed to delete POAM item',
      life: 3000
    })
  }
}
</script> 