<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Assets</h3>
      <button
        @click="showCreateModal = true"
        class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md"
      >
        Add Asset
      </button>
    </div>

    <div v-if="assets.length > 0">
      <div class="space-y-4">
        <div
          v-for="(asset, index) in assets"
          :key="asset.uuid || index"
          class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ asset.title || 'Untitled Asset' }}</h4>
            <div class="flex gap-2">
              <button
                @click="editAsset(asset)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
              <button
                @click="removeAsset(index)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div v-if="asset.uuid">
              <span class="font-medium text-gray-700 dark:text-slate-400">UUID:</span>
              <span class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{{ asset.uuid }}</span>
            </div>
            <div v-if="asset.components && asset.components.length > 0">
              <span class="font-medium text-gray-700 dark:text-slate-400">Components:</span>
              <span class="ml-2 text-gray-900 dark:text-slate-300">{{ asset.components.length }}</span>
            </div>
          </div>

          <div v-if="asset.description" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400">Description:</span>
            <p class="mt-1 text-gray-900 dark:text-slate-300">{{ asset.description }}</p>
          </div>

          <!-- Properties Section -->
          <div v-if="asset.props && asset.props.length > 0" class="mt-4">
            <span class="font-medium text-gray-700 dark:text-slate-400">Properties:</span>
            <div class="mt-2 space-y-2">
              <div
                v-for="(prop, propIndex) in asset.props"
                :key="prop.uuid || propIndex"
                class="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-sm"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div v-if="prop.name">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Name:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ prop.name }}</span>
                  </div>
                  <div v-if="prop.value">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Value:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ prop.value }}</span>
                  </div>
                  <div v-if="prop.class">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Class:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ prop.class }}</span>
                  </div>
                  <div v-if="prop.ns">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Namespace:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ prop.ns }}</span>
                  </div>
                </div>
                <div v-if="prop.remarks" class="mt-1">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Remarks:</span>
                  <span class="ml-1 text-gray-900 dark:text-slate-300">{{ prop.remarks }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Links Section -->
          <div v-if="asset.links && asset.links.length > 0" class="mt-4">
            <span class="font-medium text-gray-700 dark:text-slate-400">Links:</span>
            <div class="mt-2 space-y-2">
              <div
                v-for="(link, linkIndex) in asset.links"
                :key="linkIndex"
                class="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-sm"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div v-if="link.href">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Href:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ link.href }}</span>
                  </div>
                  <div v-if="link.rel">
                    <span class="font-medium text-gray-600 dark:text-slate-400">Rel:</span>
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{ link.rel }}</span>
                  </div>
                </div>
                <div v-if="link.text" class="mt-1">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Text:</span>
                  <span class="ml-1 text-gray-900 dark:text-slate-300">{{ link.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No assets defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">Click "Add Asset" to create your first assessment asset.</p>
    </div>

    <!-- Asset Create Modal -->
    <AssetCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="onAssetCreated"
    />

    <!-- Asset Edit Modal -->
    <AssetEditModal
      v-model="showEditModal"
      :assessment-plan-id="route.params.id as string"
      :asset="editingAsset"
      @updated="onAssetUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type AssessmentAsset, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import AssetCreateModal from '@/components/assessment-plans/AssetCreateModal.vue'
import AssetEditModal from '@/components/assessment-plans/AssetEditModal.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const assets = ref<AssessmentAsset[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingAsset = ref<AssessmentAsset>({} as AssessmentAsset)

function editAsset(asset: AssessmentAsset) {
  editingAsset.value = { ...asset }
  showEditModal.value = true
}

async function onAssetCreated(asset: AssessmentAsset) {
  // Refresh the assets list from the backend
  await loadAssets()
}

async function onAssetUpdated(asset: AssessmentAsset) {
  // Refresh the assets list from the backend
  await loadAssets()
}

async function removeAsset(index: number) {
  confirm.require({
    message: 'Are you sure you want to remove this asset?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        assets.value.splice(index, 1)

        // Save to backend
        const id = route.params.id as string
        await assessmentPlanStore.updateAssessmentAssets(id, assets.value)

        toast.add({
          severity: 'success',
          summary: 'Asset Removed',
          detail: 'Asset has been removed successfully',
          life: 3000
        })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error removing asset',
          detail: 'Failed to remove asset. Please try again.',
          life: 3000
        })
      }
    },
    reject: () => {
      // Optional: Handle rejection if needed
    }
  })
}

async function loadAssets() {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.getAssessmentAssets(id)
    assets.value = response.data || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading assets',
      detail: 'Failed to load assessment plan assets. Please try again.',
      life: 3000
    })
  }
}

onMounted(async () => {
  await loadAssets()
})
</script>
