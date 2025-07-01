<template>
  <div class="space-y-6">
    <!-- Metadata Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">System Security Plan Metadata</h3>
      
      <div v-if="systemSecurityPlan.metadata" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemSecurityPlan.metadata.title }}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">UUID</label>
          <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">{{ systemSecurityPlan.uuid }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Version</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemSecurityPlan.metadata.version || 'N/A' }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Last Modified</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(systemSecurityPlan.metadata.lastModified) }}</p>
        </div>

        <div v-if="systemSecurityPlan.metadata.published" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Published</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(systemSecurityPlan.metadata.published) }}</p>
        </div>

        <div v-if="systemSecurityPlan.metadata.remarks" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemSecurityPlan.metadata.remarks }}</p>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading metadata...</p>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">Actions</h3>
      
      <div class="flex flex-wrap gap-3">
        <button
          @click="editMetadata"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit Metadata
        </button>
        <button
          @click="editSystemCharacteristics"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit System Characteristics
        </button>
        <button
          @click="editImplementation"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit Implementation
        </button>
        <button
          @click="editControls"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit Controls
        </button>
        <button
          @click="downloadJson"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Download JSON
        </button>
      </div>

      <!-- Feature Notice -->
      <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <p class="text-sm text-green-800 dark:text-green-200">
          <strong>Edit Mode:</strong> Edit buttons are now enabled. Some editing functionality is still in development.
          You can view all SSP data and download the full JSON representation.
        </p>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ statistics.systemUsers }}</div>
        <div class="text-sm text-blue-600 dark:text-blue-400">System Users</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ statistics.systemComponents }}</div>
        <div class="text-sm text-green-600 dark:text-green-400">Components</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ statistics.inventoryItems }}</div>
        <div class="text-sm text-purple-600 dark:text-purple-400">Inventory Items</div>
      </div>
      <div class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ statistics.leveragedAuthorizations }}</div>
        <div class="text-sm text-orange-600 dark:text-orange-400">Leveraged Authorizations</div>
      </div>
    </div>

    <!-- System Characteristics Summary -->
    <div v-if="systemCharacteristics" class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">System Characteristics Summary</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-if="systemCharacteristics.systemName">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">System Name</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemCharacteristics.systemName }}</p>
        </div>
        
        <div v-if="systemCharacteristics.systemNameShort">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">System Name (Short)</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemCharacteristics.systemNameShort }}</p>
        </div>

        <div v-if="systemCharacteristics.securitySensitivityLevel">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Security Sensitivity Level</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemCharacteristics.securitySensitivityLevel }}</p>
        </div>

        <div v-if="systemCharacteristics.dateAuthorized">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Date Authorized</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(systemCharacteristics.dateAuthorized.toString()) }}</p>
        </div>

        <div v-if="systemCharacteristics.description" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemCharacteristics.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  type SystemSecurityPlan, 
  type SystemCharacteristics,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts'

const route = useRoute()
const sspStore = useSystemSecurityPlanStore()

const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan)
const systemCharacteristics = ref<SystemCharacteristics | null>(null)
const systemImplementationStats = ref({
  users: 0,
  components: 0,
  inventoryItems: 0,
  leveragedAuthorizations: 0
})

const statistics = computed(() => ({
  systemUsers: systemImplementationStats.value.users,
  systemComponents: systemImplementationStats.value.components,
  inventoryItems: systemImplementationStats.value.inventoryItems,
  leveragedAuthorizations: systemImplementationStats.value.leveragedAuthorizations
}))

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    // Load basic SSP data
    const sspResponse = await sspStore.get(id)
    systemSecurityPlan.value = sspResponse.data

    // Load system characteristics
    try {
      const characteristicsResponse = await sspStore.getCharacteristics(id)
      systemCharacteristics.value = characteristicsResponse.data
    } catch (error) {
      console.warn('Could not load system characteristics:', error)
    }

    // Load system implementation statistics
    try {
      const [usersResponse, componentsResponse, inventoryResponse, leveragedAuthsResponse] = await Promise.allSettled([
        sspStore.getSystemImplementationUsers(id),
        sspStore.getSystemImplementationComponents(id),
        sspStore.getSystemImplementationInventoryItems(id),
        sspStore.getSystemImplementationLeveragedAuthorizations(id)
      ])

      systemImplementationStats.value = {
        users: usersResponse.status === 'fulfilled' ? usersResponse.value.data.length : 0,
        components: componentsResponse.status === 'fulfilled' ? componentsResponse.value.data.length : 0,
        inventoryItems: inventoryResponse.status === 'fulfilled' ? inventoryResponse.value.data.length : 0,
        leveragedAuthorizations: leveragedAuthsResponse.status === 'fulfilled' ? leveragedAuthsResponse.value.data.length : 0
      }
    } catch (error) {
      console.warn('Could not load some system implementation statistics:', error)
    }
  } catch (error) {
    console.error('Error loading System Security Plan overview:', error)
  }
})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

async function downloadJson(): Promise<void> {
  try {
    const response = await sspStore.full(route.params.id as string)
    const dataStr = JSON.stringify(response.data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ssp-${systemSecurityPlan.value.uuid}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error downloading JSON:', err)
  }
}

// Placeholder functions for editing functionality
const editMetadata = () => {
  console.log('Edit Metadata - functionality coming soon')
  alert('Metadata editing functionality is in development')
}

const editSystemCharacteristics = () => {
  console.log('Edit System Characteristics - functionality coming soon')
  alert('System Characteristics editing functionality is in development')
}

const editImplementation = () => {
  console.log('Edit Implementation - functionality coming soon')
  alert('Implementation editing functionality is in development')
}

const editControls = () => {
  console.log('Edit Controls - functionality coming soon')
  alert('Controls editing functionality is in development')
}
</script>