<template>
  <div class="space-y-6">
    <!-- System Characteristics Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">System Characteristics</h3>
        <button
          @click="() => {}"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Edit
        </button>
      </div>
      
      <div v-if="characteristics" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-if="characteristics.systemName">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">System Name</label>
          <p class="text-gray-900 dark:text-slate-300">{{ characteristics.systemName }}</p>
        </div>
        
        <div v-if="characteristics.systemNameShort">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">System Name (Short)</label>
          <p class="text-gray-900 dark:text-slate-300">{{ characteristics.systemNameShort }}</p>
        </div>

        <div v-if="characteristics.securitySensitivityLevel">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Security Sensitivity Level</label>
          <p class="text-gray-900 dark:text-slate-300">{{ characteristics.securitySensitivityLevel }}</p>
        </div>

        <div v-if="characteristics.dateAuthorized">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Date Authorized</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(characteristics.dateAuthorized?.toString()) }}</p>
        </div>

        <div v-if="characteristics.description" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ characteristics.description }}</p>
        </div>

        <div v-if="characteristics.remarks" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300">{{ characteristics.remarks }}</p>
        </div>
      </div>

      <div v-else-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading system characteristics...</p>
      </div>

      <div v-else-if="error" class="text-center py-4">
        <p class="text-red-500">Error loading system characteristics: {{ error }}</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No system characteristics available.</p>
      </div>
    </div>

    <!-- Network Architecture Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">Network Architecture</h3>
        <button
          @click="() => {}"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Edit
        </button>
      </div>
      
      <div v-if="networkArchitecture">
        <div v-if="networkArchitecture.description" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ networkArchitecture.description }}</p>
        </div>

        <div v-if="networkArchitecture.diagrams?.length" class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Diagrams</label>
          <div class="space-y-2">
            <div 
              v-for="diagram in networkArchitecture.diagrams" 
              :key="diagram.uuid"
              class="p-3 bg-gray-50 dark:bg-slate-800 rounded border"
            >
              <div class="font-medium text-gray-900 dark:text-slate-300">{{ diagram.caption || 'Diagram' }}</div>
              <div v-if="diagram.description" class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ diagram.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="networkArchitectureLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading network architecture...</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No network architecture information available.</p>
      </div>
    </div>

    <!-- Data Flow Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">Data Flow</h3>
        <button
          @click="() => {}"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Edit
        </button>
      </div>
      
      <div v-if="dataFlow">
        <div v-if="dataFlow.description" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ dataFlow.description }}</p>
        </div>

        <div v-if="dataFlow.diagrams?.length" class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Diagrams</label>
          <div class="space-y-2">
            <div 
              v-for="diagram in dataFlow.diagrams" 
              :key="diagram.uuid"
              class="p-3 bg-gray-50 dark:bg-slate-800 rounded border"
            >
              <div class="font-medium text-gray-900 dark:text-slate-300">{{ diagram.caption || 'Diagram' }}</div>
              <div v-if="diagram.description" class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ diagram.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="dataFlowLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading data flow...</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No data flow information available.</p>
      </div>
    </div>

    <!-- Authorization Boundary Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">Authorization Boundary</h3>
        <button
          @click="() => {}"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Edit
        </button>
      </div>
      
      <div v-if="authorizationBoundary">
        <div v-if="authorizationBoundary.description" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ authorizationBoundary.description }}</p>
        </div>

        <div v-if="authorizationBoundary.diagrams?.length" class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Diagrams</label>
          <div class="space-y-2">
            <div 
              v-for="diagram in authorizationBoundary.diagrams" 
              :key="diagram.uuid"
              class="p-3 bg-gray-50 dark:bg-slate-800 rounded border"
            >
              <div class="font-medium text-gray-900 dark:text-slate-300">{{ diagram.caption || 'Diagram' }}</div>
              <div v-if="diagram.description" class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ diagram.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="authorizationBoundaryLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading authorization boundary...</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No authorization boundary information available.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { 
  type SystemCharacteristics,
  type DiagramGrouping,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts'

const route = useRoute()
const sspStore = useSystemSecurityPlanStore()

const characteristics = ref<SystemCharacteristics | null>(null)
const networkArchitecture = ref<DiagramGrouping | null>(null)
const dataFlow = ref<DiagramGrouping | null>(null)
const authorizationBoundary = ref<DiagramGrouping | null>(null)

const loading = ref(true)
const networkArchitectureLoading = ref(true)
const dataFlowLoading = ref(true)
const authorizationBoundaryLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    // Load system characteristics
    try {
      const response = await sspStore.getCharacteristics(id)
      characteristics.value = response.data
    } catch (err: any) {
      console.warn('Could not load system characteristics:', err)
      if (err instanceof Response) {
        error.value = `Failed to load system characteristics: ${err.status} ${err.statusText}`
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Failed to load system characteristics'
      }
    } finally {
      loading.value = false
    }

    // Load network architecture
    try {
      const response = await sspStore.getCharacteristicsNetworkArchitecture(id)
      networkArchitecture.value = response.data
    } catch (err) {
      console.warn('Could not load network architecture:', err)
    } finally {
      networkArchitectureLoading.value = false
    }

    // Load data flow
    try {
      const response = await sspStore.getCharacteristicsDataFlow(id)
      dataFlow.value = response.data
    } catch (err) {
      console.warn('Could not load data flow:', err)
    } finally {
      dataFlowLoading.value = false
    }

    // Load authorization boundary
    try {
      const response = await sspStore.getCharacteristicsAuthorizationBoundary(id)
      authorizationBoundary.value = response.data
    } catch (err) {
      console.warn('Could not load authorization boundary:', err)
    } finally {
      authorizationBoundaryLoading.value = false
    }
  } catch (error) {
    console.error('Error loading system characteristics:', error)
  }
})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}
</script>