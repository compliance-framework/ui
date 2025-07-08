<template>
  <div class="space-y-6">
    <!-- Metadata Section -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">Plan of Action and Milestones Metadata</h3>
      
      <div v-if="planOfActionAndMilestones.metadata" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
          <p class="text-gray-900 dark:text-slate-300">{{ planOfActionAndMilestones.metadata?.title }}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">UUID</label>
          <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">{{ planOfActionAndMilestones.uuid }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Version</label>
          <p class="text-gray-900 dark:text-slate-300">{{ planOfActionAndMilestones.metadata?.version }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">OSCAL Version</label>
          <p class="text-gray-900 dark:text-slate-300">{{ planOfActionAndMilestones.metadata?.oscalVersion || 'N/A' }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Last Modified</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(planOfActionAndMilestones.metadata?.lastModified) }}</p>
        </div>

        <div v-if="planOfActionAndMilestones.metadata?.published">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Published</label>
          <p class="text-gray-900 dark:text-slate-300">{{ formatDate(planOfActionAndMilestones.metadata?.published) }}</p>
        </div>

        <div v-if="planOfActionAndMilestones.metadata.remarks" class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300">{{ planOfActionAndMilestones.metadata.remarks }}</p>
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
          @click="showEditModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit POAM
        </button>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/poam-items`"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Manage POAM Items
        </RouterLink>
        <button
          disabled
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Edit functionality is currently disabled"
        >
          Edit Roles
        </button>
        <button
          disabled
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Edit functionality is currently disabled"
        >
          Edit Parties
        </button>
        <button
          @click="downloadJson"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Download JSON
        </button>
      </div>
    </div>

    <!-- Edit Metadata Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false" size="lg">
      <MetadataEditForm
        v-if="showEditModal && planOfActionAndMilestones.metadata"
        :poam-id="route.params.id as string"
        :metadata="planOfActionAndMilestones.metadata"
        @cancel="showEditModal = false"
        @saved="handleMetadataSaved"
      />
    </Modal>

    <!-- Summary Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ statistics.poamItems }}</div>
        <div class="text-sm text-blue-600 dark:text-blue-400">POAM Items</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ statistics.observations }}</div>
        <div class="text-sm text-green-600 dark:text-green-400">Observations</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ statistics.risks }}</div>
        <div class="text-sm text-purple-600 dark:text-purple-400">Risks</div>
      </div>
    </div>

    <!-- POAM Items Summary -->
    <div v-if="poamItems.length > 0" class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">POAM Items Summary</h3>
      
      <div class="space-y-4">
        <div
          v-for="item in poamItems.slice(0, 5)"
          :key="item.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ item.title }}</h4>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ item.description }}</p>
            </div>
            <div class="text-sm text-gray-500 dark:text-slate-400 ml-4">
              <div v-if="item.relatedFindings?.length">
                {{ item.relatedFindings.length }} related findings
              </div>
              <div v-if="item.relatedObservations?.length">
                {{ item.relatedObservations.length }} related observations
              </div>
              <div v-if="item.relatedRisks?.length">
                {{ item.relatedRisks.length }} related risks
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="poamItems.length > 5" class="text-center text-sm text-gray-500 dark:text-slate-400">
          Showing first 5 of {{ poamItems.length }} POAM items
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { 
  type PlanOfActionAndMilestones, 
  type PoamItem,
  usePlanOfActionAndMilestonesStore 
} from '@/stores/plan-of-action-and-milestones.ts'
import MetadataEditForm from '@/components/poam/MetadataEditForm.vue'
import Modal from '@/components/Modal.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const planOfActionAndMilestones = ref<PlanOfActionAndMilestones>({} as PlanOfActionAndMilestones)
const poamItems = ref<PoamItem[]>([])
const showEditModal = ref(false)

const statistics = computed(() => ({
  poamItems: poamItems.value.length,
  observations: poamItems.value.filter(item => item.relatedObservations && item.relatedObservations.length > 0).length,
  risks: poamItems.value.filter(item => item.relatedRisks && item.relatedRisks.length > 0).length
}))

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    // Load basic POAM data
    const poamResponse = await poamStore.get(id)
    planOfActionAndMilestones.value = poamResponse.data

    // Load POAM items
    try {
      const itemsResponse = await poamStore.getPoamItems(id)
      poamItems.value = itemsResponse.data
    } catch (error) {
      console.warn('Could not load POAM items:', error)
    }



  } catch (error) {
    console.error('Error loading POAM data:', error)
  }
})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

async function downloadJson(): Promise<void> {
  try {
    const response = await poamStore.full(route.params.id as string)
    const dataStr = JSON.stringify(response.data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${planOfActionAndMilestones.value.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'poam'}-poam.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading JSON:', error)
  }
}

function handleMetadataSaved(updatedMetadata: any) {
  // Update the metadata in the current POAM data
  if (planOfActionAndMilestones.value.metadata) {
    planOfActionAndMilestones.value.metadata = updatedMetadata
  }
  
  showEditModal.value = false
  
  // Show success message
  toast.add({
    severity: 'success',
    summary: 'Metadata Updated',
    detail: 'POAM metadata updated successfully',
    life: 3000
  })
}
</script> 