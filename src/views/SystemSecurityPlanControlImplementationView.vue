<template>
  <div class="space-y-6">
    <!-- Control Implementation Overview -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">Control Implementation</h3>
        <button
          @click="editControlImplementation"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
      </div>
      
      <div v-if="controlImplementation" class="grid grid-cols-1 gap-6">
        <div v-if="controlImplementation.source">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Source</label>
          <p class="text-gray-900 dark:text-slate-300">{{ controlImplementation.source }}</p>
        </div>

        <div v-if="controlImplementation.description">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ controlImplementation.description }}</p>
        </div>

        <!-- Summary Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ controlImplementation.implementedRequirements?.length || 0 }}</div>
            <div class="text-sm text-blue-600 dark:text-blue-400">Implemented Requirements</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ totalStatements }}</div>
            <div class="text-sm text-green-600 dark:text-green-400">Total Statements</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ totalByComponents }}</div>
            <div class="text-sm text-purple-600 dark:text-purple-400">Component Implementations</div>
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading control implementation...</p>
      </div>

      <div v-else-if="error" class="text-center py-4">
        <p class="text-red-500">Error loading control implementation: {{ error }}</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No control implementation information available.</p>
      </div>
    </div>

    <!-- Implemented Requirements -->
    <div v-if="controlImplementation" class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Implemented Requirements 
          <span class="text-sm font-normal text-gray-500 dark:text-slate-400">({{ controlImplementation.implementedRequirements?.length || 0 }})</span>
        </h3>
        <button
          @click="addRequirement"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Requirement
        </button>
      </div>

      <div v-if="controlImplementation.implementedRequirements?.length" class="space-y-6">
        <div 
          v-for="requirement in controlImplementation.implementedRequirements" 
          :key="requirement.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ requirement.controlId }}</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ requirement.remarks }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="editRequirement(requirement)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                @click="deleteRequirement(requirement)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Statements -->
          <div v-if="requirement.statements?.length" class="mt-4">
            <h5 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">
              Statements ({{ requirement.statements.length }})
            </h5>
            <div class="space-y-3">
              <div 
                v-for="statement in requirement.statements" 
                :key="statement.uuid"
                class="bg-gray-50 dark:bg-slate-800 p-3 rounded border"
              >
                <div class="flex justify-between items-start mb-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-slate-300">{{ statement.statementId }}</span>
                  <button
                    @click="editStatement(requirement, statement)"
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-slate-400">{{ statement.description }}</p>
                
                <!-- Statement By Components -->
                <div v-if="statement.byComponents?.length" class="mt-2">
                  <span class="text-xs font-medium text-gray-700 dark:text-slate-400">By Components:</span>
                  <div class="mt-1 space-y-1">
                    <div 
                      v-for="byComponent in statement.byComponents" 
                      :key="byComponent.uuid"
                      class="text-xs bg-white dark:bg-slate-900 p-2 rounded border"
                    >
                      <div class="flex justify-between items-start">
                        <span class="font-medium">{{ byComponent.componentUuid }}</span>
                        <button
                          @click="editByComponent(statement, byComponent)"
                          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                      </div>
                      <p class="text-gray-600 dark:text-slate-400 mt-1">{{ byComponent.description }}</p>
                      
                      <!-- Export Information -->
                      <div v-if="byComponent.export" class="mt-2 text-xs">
                        <div v-if="byComponent.export.provided?.length" class="mb-1">
                          <span class="font-medium text-green-700 dark:text-green-400">Provided:</span>
                          <div class="ml-2">
                            <div v-for="provided in byComponent.export.provided" :key="provided.uuid" class="text-green-600 dark:text-green-400">
                              {{ provided.description }}
                            </div>
                          </div>
                        </div>
                        <div v-if="byComponent.export.responsibilities?.length" class="mb-1">
                          <span class="font-medium text-orange-700 dark:text-orange-400">Responsibilities:</span>
                          <div class="ml-2">
                            <div v-for="responsibility in byComponent.export.responsibilities" :key="responsibility.uuid" class="text-orange-600 dark:text-orange-400">
                              {{ responsibility.description }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Satisfied Requirements -->
                      <div v-if="byComponent.satisfied?.length" class="mt-2 text-xs">
                        <span class="font-medium text-blue-700 dark:text-blue-400">Satisfied:</span>
                        <div class="ml-2">
                          <div v-for="satisfied in byComponent.satisfied" :key="satisfied.uuid" class="text-blue-600 dark:text-blue-400">
                            {{ satisfied.description }}
                          </div>
                        </div>
                      </div>

                      <!-- Inherited Requirements -->
                      <div v-if="byComponent.inherited?.length" class="mt-2 text-xs">
                        <span class="font-medium text-purple-700 dark:text-purple-400">Inherited:</span>
                        <div class="ml-2">
                          <div v-for="inherited in byComponent.inherited" :key="inherited.uuid" class="text-purple-600 dark:text-purple-400">
                            {{ inherited.description }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Requirement By Components (at requirement level) -->
          <div v-if="requirement.byComponents?.length" class="mt-4">
            <h5 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">
              Component Implementations ({{ requirement.byComponents.length }})
            </h5>
            <div class="space-y-2">
              <div 
                v-for="byComponent in requirement.byComponents" 
                :key="byComponent.uuid"
                class="bg-gray-50 dark:bg-slate-800 p-3 rounded border"
              >
                <div class="flex justify-between items-start mb-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-slate-300">{{ byComponent.componentUuid }}</span>
                  <button
                    @click="editRequirementByComponent(requirement, byComponent)"
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
                <p class="text-sm text-gray-600 dark:text-slate-400">{{ byComponent.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">No implemented requirements yet. Click "Add Requirement" to get started.</p>
      </div>
    </div>
  </div>

  <!-- Control Implementation Edit Modal -->
  <Modal :show="showEditControlImplementationModal && controlImplementation !== null" @close="showEditControlImplementationModal = false" size="lg">
    <ControlImplementationEditForm 
      v-if="controlImplementation"
      :ssp-id="route.params.id as string"
      :control-implementation="controlImplementation"
      @cancel="showEditControlImplementationModal = false"
      @saved="handleControlImplementationSaved"
    />
  </Modal>

  <!-- Requirement Create Modal -->
  <Modal :show="showCreateRequirementModal" @close="showCreateRequirementModal = false" size="lg">
    <ImplementedRequirementCreateForm 
      :ssp-id="route.params.id as string"
      @cancel="showCreateRequirementModal = false"
      @created="handleRequirementCreated"
    />
  </Modal>

  <!-- Requirement Edit Modal -->
  <Modal :show="showEditRequirementModal && editingRequirement !== null" @close="showEditRequirementModal = false" size="lg">
    <ImplementedRequirementEditForm 
      v-if="editingRequirement"
      :ssp-id="route.params.id as string"
      :requirement="editingRequirement"
      @cancel="showEditRequirementModal = false"
      @saved="handleRequirementSaved"
    />
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { 
  type ControlImplementation,
  type ImplementedRequirement,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts'
import Modal from '@/components/Modal.vue'
import ImplementedRequirementCreateForm from '@/components/system-security-plans/ImplementedRequirementCreateForm.vue'
import ImplementedRequirementEditForm from '@/components/system-security-plans/ImplementedRequirementEditForm.vue'
import ControlImplementationEditForm from '@/components/system-security-plans/ControlImplementationEditForm.vue'

const route = useRoute()
const sspStore = useSystemSecurityPlanStore()
const toast = useToast()

const controlImplementation = ref<ControlImplementation | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showCreateRequirementModal = ref(false)
const showEditRequirementModal = ref(false)
const showEditControlImplementationModal = ref(false)

// Edit targets
const editingRequirement = ref<ImplementedRequirement | null>(null)

const totalStatements = computed(() => {
  if (!controlImplementation.value?.implementedRequirements) return 0
  return controlImplementation.value.implementedRequirements.reduce((total: number, req: any) => {
    return total + (req.statements?.length || 0)
  }, 0)
})

const totalByComponents = computed(() => {
  if (!controlImplementation.value?.implementedRequirements) return 0
  let total = 0
  controlImplementation.value.implementedRequirements.forEach((req: any) => {
    total += req.byComponents?.length || 0
    if (req.statements) {
      req.statements.forEach((statement: any) => {
        total += statement.byComponents?.length || 0
      })
    }
  })
  return total
})

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await sspStore.getControlImplementation(id)
    controlImplementation.value = response.data
  } catch (err) {
    console.error('Error loading control implementation:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})

// Control Implementation management
const editControlImplementation = () => {
  showEditControlImplementationModal.value = true
}

const handleControlImplementationSaved = (updatedControlImpl: ControlImplementation) => {
  controlImplementation.value = updatedControlImpl
  showEditControlImplementationModal.value = false
}

// Requirement management
const addRequirement = () => {
  showCreateRequirementModal.value = true
}

const editRequirement = (requirement: ImplementedRequirement) => {
  editingRequirement.value = requirement
  showEditRequirementModal.value = true
}

const deleteRequirement = async (requirement: ImplementedRequirement) => {
  if (!confirm(`Are you sure you want to delete requirement "${requirement.controlId}"?`)) {
    return
  }
  
  try {
    await sspStore.deleteImplementedRequirement(route.params.id as string, requirement.uuid)
    if (controlImplementation.value) {
      controlImplementation.value.implementedRequirements = 
        controlImplementation.value.implementedRequirements.filter(r => r.uuid !== requirement.uuid)
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Implemented requirement deleted successfully.',
      life: 3000
    })
  } catch (error) {
    console.error('Failed to delete implemented requirement:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete implemented requirement. Please try again.',
      life: 5000
    })
  }
}

const handleRequirementCreated = (newRequirement: ImplementedRequirement) => {
  if (controlImplementation.value) {
    controlImplementation.value.implementedRequirements.push(newRequirement)
  }
  showCreateRequirementModal.value = false
}

const handleRequirementSaved = (updatedRequirement: ImplementedRequirement) => {
  if (controlImplementation.value) {
    const index = controlImplementation.value.implementedRequirements.findIndex(r => r.uuid === updatedRequirement.uuid)
    if (index !== -1) {
      controlImplementation.value.implementedRequirements[index] = updatedRequirement
    }
  }
  showEditRequirementModal.value = false
  editingRequirement.value = null
}

// Placeholder functions for nested editing (statements, by-components)
const editStatement = (requirement: ImplementedRequirement, statement: any) => {
  console.log('Edit Statement:', requirement, statement)
  alert('Statement editing functionality is in development')
}

const editByComponent = (statement: any, byComponent: any) => {
  console.log('Edit Statement By Component:', statement, byComponent)
  alert('Statement By Component editing functionality is in development')
}

const editRequirementByComponent = (requirement: ImplementedRequirement, byComponent: any) => {
  console.log('Edit Requirement By Component:', requirement, byComponent)
  alert('Requirement By Component editing functionality is in development')
}
</script>