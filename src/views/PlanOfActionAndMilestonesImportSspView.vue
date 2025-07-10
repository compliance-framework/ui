<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Import SSP</h2>
      <div class="flex gap-2">
        <button
          @click="showCreateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Create New Import SSP
        </button>
        <button
          v-if="importSsp"
          @click="showEditModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit Import SSP
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading import SSP data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading import SSP data: {{ error }}</p>
    </div>

    <div v-else-if="importSsp" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Href</label>
          <p class="text-gray-900 dark:text-slate-300 font-mono text-sm break-all">{{ importSsp.href }}</p>
        </div>
        
        <div v-if="importSsp.remarks">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ importSsp.remarks }}</p>
        </div>
        
        <div class="flex justify-end mt-4">
          <button
            @click="deleteImportSsp"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Delete Import SSP
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No import SSP data available.</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Create Import SSP
      </button>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <ImportSspForm 
        :poam-id="route.params.id as string"
        :import-ssp="undefined"
        @cancel="showCreateModal = false"
        @saved="handleImportSspSaved"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false" size="lg">
      <ImportSspForm 
        :poam-id="route.params.id as string"
        :import-ssp="importSsp || undefined"
        @cancel="showEditModal = false"
        @saved="handleImportSspSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type ImportSsp, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import ImportSspForm from '@/components/poam/ImportSspForm.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const loading = ref(true)
const error = ref<string | null>(null)
const importSsp = ref<ImportSsp | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)

onMounted(async () => {
  await loadImportSsp()
})

async function loadImportSsp() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getImportSsp(id)
    importSsp.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load import SSP: ${errorMessage}`,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

function handleImportSspSaved(savedImportSsp: ImportSsp) {
  importSsp.value = savedImportSsp
  showCreateModal.value = false
  showEditModal.value = false
}

async function deleteImportSsp() {
  if (!confirm('Are you sure you want to delete this import SSP?')) {
    return
  }

  try {
    const id = route.params.id as string
    await poamStore.deleteImportSsp(id)
    
    toast.add({
      severity: 'success',
      summary: 'Import SSP Deleted',
      detail: 'Import SSP deleted successfully',
      life: 3000
    })
    
    importSsp.value = null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete import SSP: ${errorMessage}`,
      life: 3000
    })
  }
}
</script> 