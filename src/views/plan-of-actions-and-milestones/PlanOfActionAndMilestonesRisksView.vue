<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Risks</h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Risk
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading risks...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading risks: {{ error }}</p>
    </div>

    <div v-else-if="!risks.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No risks found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="risk in risks"
        :key="risk.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ risk.title || 'Untitled Risk' }}</h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">{{ risk.description }}</p>
            
            <div v-if="risk.statement" class="mt-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Statement</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">{{ risk.statement }}</p>
            </div>
            
            <div class="mt-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Status</h4>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {{ risk.status }}
              </span>
            </div>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-if="risk.threatIds?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {{ risk.threatIds.length }} Threats
              </span>
              <span v-if="risk.characterizations?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {{ risk.characterizations.length }} Characterizations
              </span>
              <span v-if="risk.mitigatingFactors?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {{ risk.mitigatingFactors.length }} Mitigating Factors
              </span>
              <span v-if="risk.remediations?.length" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {{ risk.remediations.length }} Remediations
              </span>
            </div>

            <div v-if="risk.deadline" class="mt-3 text-sm text-gray-500 dark:text-slate-400">
              <strong>Deadline:</strong> {{ formatDate(risk.deadline) }}
            </div>
          </div>
          
          <div class="ml-4 flex gap-2">
            <button
              @click="editRisk(risk)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="deleteRisk(risk.uuid || '')"
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
      <RiskCreateForm 
        :poam-id="route.params.id as string"
        @cancel="showCreateModal = false"
        @created="handleRiskCreated"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal && editingRisk !== null" @close="showEditModal = false" size="lg">
      <RiskEditForm 
        v-if="editingRisk"
        :poam-id="route.params.id as string"
        :risk="editingRisk"
        @cancel="showEditModal = false"
        @saved="handleRiskSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type Risk, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import Modal from '@/components/Modal.vue'
import RiskCreateForm from '@/components/poam/RiskCreateForm.vue'
import RiskEditForm from '@/components/poam/RiskEditForm.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const risks = ref<Risk[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)

// Edit targets
const editingRisk = ref<Risk | null>(null)

onMounted(async () => {
  await loadRisks()
})

async function loadRisks() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getRisks(id)
    risks.value = response.data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    error.value = errorMessage
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load risks: ${errorMessage}`,
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Risk management
const editRisk = (risk: Risk) => {
  editingRisk.value = risk
  showEditModal.value = true
}

const handleRiskCreated = (newRisk: Risk) => {
  risks.value.push(newRisk)
  showCreateModal.value = false
}

const handleRiskSaved = (updatedRisk: Risk) => {
  const index = risks.value.findIndex(risk => risk.uuid === updatedRisk.uuid)
  if (index !== -1) {
    risks.value[index] = updatedRisk
  }
  showEditModal.value = false
  editingRisk.value = null
}

async function deleteRisk(uuid: string) {
  if (!uuid || !confirm('Are you sure you want to delete this risk?')) {
    return
  }

  try {
    const id = route.params.id as string
    await poamStore.deleteRisk(id, uuid)
    
    toast.add({
      severity: 'success',
      summary: 'Risk Deleted',
      detail: 'Risk deleted successfully',
      life: 3000
    })
    
    await loadRisks() // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete risk: ${errorMessage}`,
      life: 3000
    })
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}
</script> 