<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">System ID</h2>
      <div class="flex gap-2">
        <button
          @click="showCreateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Create New System ID
        </button>
        <button
          v-if="systemId"
          @click="showEditModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit System ID
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading system ID data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading system ID data: {{ error }}</p>
    </div>

    <div v-else-if="systemId" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Identifier</label>
          <p class="text-gray-900 dark:text-slate-300 font-mono text-sm break-all">{{ systemId.id || systemId.identifier }}</p>
        </div>
        
        <div v-if="systemId.identifierType">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Identifier Type</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemId.identifierType }}</p>
        </div>
        
        <div v-if="systemId.remarks">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ systemId.remarks }}</p>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No system ID data available.</p>
      <button
        @click="showCreateModal = true"
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Create System ID
      </button>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <SystemIdForm 
        :poam-id="route.params.id as string"
        :system-id="undefined"
        @cancel="showCreateModal = false"
        @saved="handleSystemIdSaved"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false" size="lg">
      <SystemIdForm 
        :poam-id="route.params.id as string"
        :system-id="systemId || undefined"
        @cancel="showEditModal = false"
        @saved="handleSystemIdSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type SystemId, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import SystemIdForm from '@/components/poam/SystemIdForm.vue'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const loading = ref(true)
const error = ref<string | null>(null)
const systemId = ref<SystemId | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)

onMounted(async () => {
  await loadSystemId()
})

async function loadSystemId() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getSystemId(id)
    systemId.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

function handleSystemIdSaved(savedSystemId: SystemId) {
  systemId.value = savedSystemId
  showCreateModal.value = false
  showEditModal.value = false
}
</script> 