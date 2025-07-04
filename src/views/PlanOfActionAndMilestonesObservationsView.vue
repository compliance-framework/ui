<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Observations</h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Observation
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading observations...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading observations: {{ error }}</p>
    </div>

    <div v-else-if="!observations.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No observations found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="observation in observations"
        :key="observation.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ observation.title || 'Untitled Observation' }}</h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">{{ observation.description }}</p>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-if="observation.methods?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {{ observation.methods.length }} Methods
              </span>
              <span v-if="observation.types?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {{ observation.types.length }} Types
              </span>
              <span v-if="observation.subjects?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {{ observation.subjects.length }} Subjects
              </span>
            </div>

            <div v-if="observation.collected || observation.expires" class="mt-3 text-sm text-gray-500 dark:text-slate-400">
              <div v-if="observation.collected">
                <strong>Collected:</strong> {{ formatDate(observation.collected) }}
              </div>
              <div v-if="observation.expires">
                <strong>Expires:</strong> {{ formatDate(observation.expires) }}
              </div>
            </div>
          </div>
          
          <div class="ml-4 flex gap-2">
            <button
              @click="editObservation(observation)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="deleteObservation(observation.uuid || '')"
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
      <ObservationCreateForm 
        :poam-id="route.params.id as string"
        @cancel="showCreateModal = false"
        @created="handleObservationCreated"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal && editingObservation !== null" @close="showEditModal = false" size="lg">
      <ObservationEditForm 
        v-if="editingObservation"
        :poam-id="route.params.id as string"
        :observation="editingObservation"
        @cancel="showEditModal = false"
        @saved="handleObservationSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type Observation, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import ObservationCreateForm from '@/components/poam/ObservationCreateForm.vue'
import ObservationEditForm from '@/components/poam/ObservationEditForm.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const observations = ref<Observation[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)

// Edit targets
const editingObservation = ref<Observation | null>(null)

onMounted(async () => {
  await loadObservations()
})

async function loadObservations() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getObservations(id)
    observations.value = response.data
  } catch (err) {
    console.error('Error loading observations:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

// Observation management
const editObservation = (observation: Observation) => {
  editingObservation.value = observation
  showEditModal.value = true
}

const handleObservationCreated = (newObservation: Observation) => {
  observations.value.push(newObservation)
  showCreateModal.value = false
}

const handleObservationSaved = (updatedObservation: Observation) => {
  const index = observations.value.findIndex(obs => obs.uuid === updatedObservation.uuid)
  if (index !== -1) {
    observations.value[index] = updatedObservation
  }
  showEditModal.value = false
  editingObservation.value = null
}

async function deleteObservation(uuid: string) {
  if (!uuid || !confirm('Are you sure you want to delete this observation?')) {
    return
  }

  try {
    const id = route.params.id as string
    await poamStore.deleteObservation(id, uuid)
    
    toast.add({
      severity: 'success',
      summary: 'Observation Deleted',
      detail: 'Observation deleted successfully',
      life: 3000
    })
    
    await loadObservations() // Reload the list
  } catch (err) {
    console.error('Error deleting observation:', err)
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err instanceof Error ? err.message : 'Failed to delete observation',
      life: 3000
    })
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}
</script> 