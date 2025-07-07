<template>
  <div class="space-y-6">
    <!-- Debug info -->
    <div v-if="debugInfo" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
      <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Debug Info:</h4>
      <pre class="text-xs text-yellow-700 dark:text-yellow-300 overflow-auto">{{ debugInfo }}</pre>
    </div>

    <!-- UUID -->
    <div v-if="item.uuid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">UUID</h4>
      </div>
      <div class="md:col-span-2">
        <code class="text-sm bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-slate-300">{{ item.uuid }}</code>
      </div>
    </div>

    <!-- Title -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300">{{ item.title }}</p>
      </div>
    </div>

    <!-- Description -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ item.description }}</p>
      </div>
    </div>

    <!-- Properties -->
    <div v-if="item.props && item.props.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Properties</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="prop in item.props"
            :key="`${prop.name}-${prop.value}`"
            class="flex items-center gap-2 text-sm"
          >
            <span class="font-medium text-gray-600 dark:text-slate-400">{{ prop.name }}:</span>
            <span class="text-gray-900 dark:text-slate-300">{{ prop.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Links -->
    <div v-if="item.links && item.links.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Links</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="link in item.links"
            :key="link.href"
            class="text-sm"
          >
            <a
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              {{ link.href }}
            </a>
            <span v-if="link.rel" class="text-gray-500 dark:text-slate-400 ml-2">({{ link.rel }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Origins -->
    <div v-if="item.origins && item.origins.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Origins</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-3">
          <div
            v-for="(origin, index) in item.origins"
            :key="index"
            class="border border-gray-200 dark:border-slate-600 rounded p-3"
          >
            <div class="space-y-2">
              <div
                v-for="actor in origin.actors"
                :key="actor.actorUuid"
                class="text-sm"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Type:</span>
                  <span class="text-gray-900 dark:text-slate-300">{{ actor.type }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Actor UUID:</span>
                  <code class="text-xs bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded text-gray-800 dark:text-slate-300">{{ actor.actorUuid }}</code>
                </div>
                <div v-if="actor.roleId" class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Role ID:</span>
                  <span class="text-gray-900 dark:text-slate-300">{{ actor.roleId }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Findings -->
    <div v-if="item.relatedFindings && item.relatedFindings.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Findings</h4>
      </div>
      <div class="md:col-span-2">
        <div v-if="loadingFindings" class="text-sm text-gray-500 dark:text-slate-400">Loading findings...</div>
        <div v-else class="space-y-2">
          <div
            v-for="(finding, index) in item.relatedFindings"
            :key="`finding-${index}`"
            class="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <code class="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                  {{ getFindingDisplayInfo(finding.findingUuid).title }}
                </code>
                <span class="text-xs text-gray-500 dark:text-slate-400">({{ finding.findingUuid }})</span>
              </div>
              <p v-if="getFindingDisplayInfo(finding.findingUuid).description" class="text-xs text-gray-600 dark:text-slate-400 mt-1">
                {{ getFindingDisplayInfo(finding.findingUuid).description }}
              </p>
            </div>
            <button
              @click="$emit('detach', { type: 'findings', uuid: finding.findingUuid })"
              class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Observations -->
    <div v-if="item.relatedObservations && item.relatedObservations.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Observations</h4>
      </div>
      <div class="md:col-span-2">
        <div v-if="loadingObservations" class="text-sm text-gray-500 dark:text-slate-400">Loading observations...</div>
        <div v-else class="space-y-2">
          <div
            v-for="(observation, index) in item.relatedObservations"
            :key="`observation-${index}`"
            class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <code class="text-sm bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-green-800 dark:text-green-200">
                  {{ getObservationDisplayInfo(observation.observationUuid).title }}
                </code>
                <span class="text-xs text-gray-500 dark:text-slate-400">({{ observation.observationUuid }})</span>
              </div>
              <p v-if="getObservationDisplayInfo(observation.observationUuid).description" class="text-xs text-gray-600 dark:text-slate-400 mt-1">
                {{ getObservationDisplayInfo(observation.observationUuid).description }}
              </p>
            </div>
            <button
              @click="$emit('detach', { type: 'observations', uuid: observation.observationUuid })"
              class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Risks -->
    <div v-if="item.relatedRisks && item.relatedRisks.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Risks</h4>
      </div>
      <div class="md:col-span-2">
        <div v-if="loadingRisks" class="text-sm text-gray-500 dark:text-slate-400">Loading risks...</div>
        <div v-else class="space-y-2">
          <div
            v-for="(risk, index) in item.relatedRisks"
            :key="`risk-${index}`"
            class="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <code class="text-sm bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-red-800 dark:text-red-200">
                  {{ getRiskDisplayInfo(risk.riskUuid).title }}
                </code>
                <span class="text-xs text-gray-500 dark:text-slate-400">({{ risk.riskUuid }})</span>
              </div>
              <p v-if="getRiskDisplayInfo(risk.riskUuid).description" class="text-xs text-gray-600 dark:text-slate-400 mt-1">
                {{ getRiskDisplayInfo(risk.riskUuid).description }}
              </p>
            </div>
            <button
              @click="$emit('detach', { type: 'risks', uuid: risk.riskUuid })"
              class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Remarks -->
    <div v-if="item.remarks" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ item.remarks }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { PoamItem, Finding, Observation, Risk } from '@/stores/plan-of-action-and-milestones'
import { usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones'

interface Props {
  item: PoamItem
  poamId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  detach: [{ type: 'findings' | 'observations' | 'risks', uuid: string }]
}>()

// Debug mode - set to true to see debug info
const isDebugMode = computed(() => false) // Set to true when debugging

const debugInfo = computed(() => {
  if (!isDebugMode.value) return null
  return JSON.stringify(props.item, null, 2)
})

// Store for fetching related item data
const poamStore = usePlanOfActionAndMilestonesStore()

// Data for related items
const relatedFindingsData = ref<Finding[]>([])
const relatedObservationsData = ref<Observation[]>([])
const relatedRisksData = ref<Risk[]>([])

// Loading states
const loadingFindings = ref(false)
const loadingObservations = ref(false)
const loadingRisks = ref(false)

// Fetch related item data
async function loadRelatedFindings() {
  if (!props.item.relatedFindings?.length) return
  
  loadingFindings.value = true
  try {
    const response = await poamStore.getFindings(props.poamId)
    const allFindings = response.data
    relatedFindingsData.value = allFindings.filter(finding => 
      props.item.relatedFindings?.some(related => related.findingUuid === finding.uuid)
    )
  } catch (error) {
    console.error('Error loading related findings:', error)
  } finally {
    loadingFindings.value = false
  }
}

async function loadRelatedObservations() {
  if (!props.item.relatedObservations?.length) return
  
  loadingObservations.value = true
  try {
    const response = await poamStore.getObservations(props.poamId)
    const allObservations = response.data
    relatedObservationsData.value = allObservations.filter(observation => 
      props.item.relatedObservations?.some(related => related.observationUuid === observation.uuid)
    )
  } catch (error) {
    console.error('Error loading related observations:', error)
  } finally {
    loadingObservations.value = false
  }
}

async function loadRelatedRisks() {
  if (!props.item.relatedRisks?.length) return
  
  loadingRisks.value = true
  try {
    const response = await poamStore.getRisks(props.poamId)
    const allRisks = response.data
    relatedRisksData.value = allRisks.filter(risk => 
      props.item.relatedRisks?.some(related => related.riskUuid === risk.uuid)
    )
  } catch (error) {
    console.error('Error loading related risks:', error)
  } finally {
    loadingRisks.value = false
  }
}

// Helper function to get item display info
function getFindingDisplayInfo(uuid: string) {
  const finding = relatedFindingsData.value.find(f => f.uuid === uuid)
  return {
    title: finding?.title || 'Unknown Finding',
    description: finding?.description || 'No description available',
    uuid: uuid
  }
}

function getObservationDisplayInfo(uuid: string) {
  const observation = relatedObservationsData.value.find(o => o.uuid === uuid)
  return {
    title: observation?.title || 'Unknown Observation',
    description: observation?.description || 'No description available',
    uuid: uuid
  }
}

function getRiskDisplayInfo(uuid: string) {
  const risk = relatedRisksData.value.find(r => r.uuid === uuid)
  return {
    title: risk?.title || 'Unknown Risk',
    description: risk?.description || 'No description available',
    uuid: uuid
  }
}

// Load related items when component mounts
onMounted(() => {
  loadRelatedFindings()
  loadRelatedObservations()
  loadRelatedRisks()
})

// Watch for changes to the item prop and reload related items
watch(
  () => props.item,
  (newItem, oldItem) => {
    // Check if the related items have changed
    const findingsChanged = JSON.stringify(newItem.relatedFindings) !== JSON.stringify(oldItem?.relatedFindings)
    const observationsChanged = JSON.stringify(newItem.relatedObservations) !== JSON.stringify(oldItem?.relatedObservations)
    const risksChanged = JSON.stringify(newItem.relatedRisks) !== JSON.stringify(oldItem?.relatedRisks)
    
    if (findingsChanged) {
      loadRelatedFindings()
    }
    if (observationsChanged) {
      loadRelatedObservations()
    }
    if (risksChanged) {
      loadRelatedRisks()
    }
  },
  { deep: true }
)
</script> 