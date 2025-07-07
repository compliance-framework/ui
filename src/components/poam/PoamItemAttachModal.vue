<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Attach Items to POAM Item
    </h3>
    
    <div class="mb-6">
      <h4 class="text-md font-medium text-gray-700 dark:text-slate-400 mb-2">{{ item.title }}</h4>
      <p class="text-sm text-gray-600 dark:text-slate-400">{{ item.description }}</p>
    </div>

    <!-- Tabs for different item types -->
    <div class="border-b border-gray-200 dark:border-slate-700 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.key
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300'
          ]"
        >
          {{ tab.label }}
          <span class="ml-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-300 py-0.5 px-2.5 rounded-full text-xs">
            {{ getAvailableCount(tab.key) }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search items..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading {{ activeTab }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading {{ activeTab }}: {{ error }}</p>
    </div>

    <!-- Content based on active tab -->
    <div v-else class="space-y-4">
      <!-- Findings Tab -->
      <div v-if="activeTab === 'findings'" class="space-y-3">
        <div
          v-for="finding in filteredFindings"
          :key="finding.uuid"
          class="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 dark:text-slate-300">{{ finding.title }}</h5>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ finding.description }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ finding.uuid }}</span>
                <span v-if="finding.status?.state" class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {{ finding.status.state }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <button
                v-if="!isAttached(finding.uuid, 'findings')"
                @click="attachItem(finding.uuid, 'findings')"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Attach
              </button>
              <button
                v-else
                @click="detachItem(finding.uuid, 'findings')"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Detach
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Observations Tab -->
      <div v-if="activeTab === 'observations'" class="space-y-3">
        <div
          v-for="observation in filteredObservations"
          :key="observation.uuid"
          class="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 dark:text-slate-300">{{ observation.title || 'Untitled' }}</h5>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ observation.description }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ observation.uuid }}</span>
                <span v-if="observation.methods?.length" class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {{ observation.methods.join(', ') }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <button
                v-if="!isAttached(observation.uuid, 'observations')"
                @click="attachItem(observation.uuid, 'observations')"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Attach
              </button>
              <button
                v-else
                @click="detachItem(observation.uuid, 'observations')"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Detach
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Risks Tab -->
      <div v-if="activeTab === 'risks'" class="space-y-3">
        <div
          v-for="risk in filteredRisks"
          :key="risk.uuid"
          class="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 dark:text-slate-300">{{ risk.title || 'Untitled' }}</h5>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ risk.description }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ risk.uuid }}</span>
                <span v-if="risk.status" class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {{ risk.status }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <button
                v-if="!isAttached(risk.uuid, 'risks')"
                @click="attachItem(risk.uuid, 'risks')"
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Attach
              </button>
              <button
                v-else
                @click="detachItem(risk.uuid, 'risks')"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Detach
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="getFilteredItems().length === 0" class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          {{ searchQuery ? 'No items match your search.' : `No ${activeTab} available.` }}
        </p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
      <button
        @click="$emit('cancel')"
        class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
      >
        Cancel
      </button>
      <button
        @click="saveChanges"
        :disabled="saving"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { type PoamItem, type Finding, type Observation, type Risk, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
  item: PoamItem
}>()

const emit = defineEmits<{
  cancel: []
  saved: [item: PoamItem]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const activeTab = ref<'findings' | 'observations' | 'risks'>('findings')

// Data
const findings = ref<Finding[]>([])
const observations = ref<Observation[]>([])
const risks = ref<Risk[]>([])

// Working copy of the item with changes
const workingItem = reactive<PoamItem>({
  ...props.item,
  relatedFindings: [...(props.item.relatedFindings || [])].filter(f => f.findingUuid && f.findingUuid.trim() !== ''),
  relatedObservations: [...(props.item.relatedObservations || [])].filter(o => o.observationUuid && o.observationUuid.trim() !== ''),
  relatedRisks: [...(props.item.relatedRisks || [])].filter(r => r.riskUuid && r.riskUuid.trim() !== '')
})

console.log('Initial props.item:', props.item)
console.log('Initial workingItem:', workingItem)

const tabs = [
  { key: 'findings' as const, label: 'Findings' },
  { key: 'observations' as const, label: 'Observations' },
  { key: 'risks' as const, label: 'Risks' }
]

// Computed properties
const filteredFindings = computed(() => {
  return findings.value.filter(finding => 
    finding.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    finding.description?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    finding.uuid?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const filteredObservations = computed(() => {
  return observations.value.filter(observation => 
    observation.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    observation.description?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    observation.uuid?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const filteredRisks = computed(() => {
  return risks.value.filter(risk => 
    risk.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    risk.description?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    risk.uuid?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Methods
function getAvailableCount(type: string): number {
  switch (type) {
    case 'findings': return findings.value.length
    case 'observations': return observations.value.length
    case 'risks': return risks.value.length
    default: return 0
  }
}

function getFilteredItems(): any[] {
  switch (activeTab.value) {
    case 'findings': return filteredFindings.value
    case 'observations': return filteredObservations.value
    case 'risks': return filteredRisks.value
    default: return []
  }
}

function isAttached(uuid: string | undefined, type: string): boolean {
  if (!uuid) return false
  
  switch (type) {
    case 'findings':
      return workingItem.relatedFindings?.some(f => f.findingUuid === uuid) || false
    case 'observations':
      return workingItem.relatedObservations?.some(o => o.observationUuid === uuid) || false
    case 'risks':
      return workingItem.relatedRisks?.some(r => r.riskUuid === uuid) || false
    default:
      return false
  }
}

function attachItem(uuid: string | undefined, type: string) {
  if (!uuid) {
    console.warn(`Cannot attach item: UUID is undefined or empty for type ${type}`)
    return
  }
  
  console.log(`Attaching ${type} with UUID:`, uuid)
  
  // Prevent duplicate attachments
  if (isAttached(uuid, type)) {
    console.warn(`Item ${uuid} is already attached`)
    return
  }
  
  switch (type) {
    case 'findings':
      if (!workingItem.relatedFindings) workingItem.relatedFindings = []
      workingItem.relatedFindings.push({ findingUuid: uuid })
      console.log('Updated relatedFindings:', workingItem.relatedFindings)
      break
    case 'observations':
      if (!workingItem.relatedObservations) workingItem.relatedObservations = []
      workingItem.relatedObservations.push({ observationUuid: uuid })
      console.log('Updated relatedObservations:', workingItem.relatedObservations)
      break
    case 'risks':
      if (!workingItem.relatedRisks) workingItem.relatedRisks = []
      workingItem.relatedRisks.push({ riskUuid: uuid })
      console.log('Updated relatedRisks:', workingItem.relatedRisks)
      break
  }
}

function detachItem(uuid: string | undefined, type: string) {
  if (!uuid) return
  
  switch (type) {
    case 'findings':
      if (workingItem.relatedFindings) {
        workingItem.relatedFindings = workingItem.relatedFindings.filter(f => f.findingUuid !== uuid)
      }
      break
    case 'observations':
      if (workingItem.relatedObservations) {
        workingItem.relatedObservations = workingItem.relatedObservations.filter(o => o.observationUuid !== uuid)
      }
      break
    case 'risks':
      if (workingItem.relatedRisks) {
        workingItem.relatedRisks = workingItem.relatedRisks.filter(r => r.riskUuid !== uuid)
      }
      break
  }
}

async function loadData() {
  loading.value = true
  error.value = null
  
  try {
    // Load all available items
    const [findingsResponse, observationsResponse, risksResponse] = await Promise.all([
      poamStore.getFindings(props.poamId),
      poamStore.getObservations(props.poamId),
      poamStore.getRisks(props.poamId)
    ])
    
    findings.value = findingsResponse.data
    observations.value = observationsResponse.data
    risks.value = risksResponse.data
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  saving.value = true
  
  console.log('Saving POAM item with data:', {
    relatedFindings: workingItem.relatedFindings,
    relatedObservations: workingItem.relatedObservations,
    relatedRisks: workingItem.relatedRisks
  })
  
  // Debug: Check each related finding UUID
  if (workingItem.relatedFindings) {
    workingItem.relatedFindings.forEach((finding, index) => {
      console.log(`Related finding ${index}:`, finding)
    })
  }
  
  try {
    console.log('About to send to backend:', workingItem)
    const response = await poamStore.updatePoamItem(props.poamId, props.item.uuid!, workingItem)
    console.log('Backend response:', response)
    console.log('Backend response data:', response.data)
    console.log('Backend response data JSON:', JSON.stringify(response.data, null, 2))
    console.log('Backend response type:', typeof response.data)
    console.log('Backend response keys:', Object.keys(response.data))
    
    // Log the specific properties we care about
    if (response.data) {
      console.log('Response data relatedFindings:', response.data.relatedFindings)
      console.log('Response data relatedObservations:', response.data.relatedObservations)
      console.log('Response data relatedRisks:', response.data.relatedRisks)
    }
    
    toast.add({
      severity: 'success',
      summary: 'POAM Item Updated',
      detail: 'Related items have been updated successfully',
      life: 3000
    })
    
    emit('saved', response.data)
  } catch (err) {
    console.error('Error updating POAM item:', err)
    
    // Try to get more details about the error
    if (err instanceof Response) {
      console.error('Response status:', err.status)
      console.error('Response statusText:', err.statusText)
      err.text().then(text => {
        console.error('Error response body:', text)
      }).catch(e => {
        console.error('Could not read error response:', e)
      })
    }
    
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: 'Failed to update POAM item. Please try again.',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script> 