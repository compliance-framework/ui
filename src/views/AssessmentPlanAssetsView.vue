<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Assets</h3>
      <button
        @click="addAsset"
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
                @click="editAsset(index)"
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
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No assets defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">Click "Add Asset" to create your first assessment asset.</p>
    </div>

    <!-- Asset Edit Modal -->
    <div v-if="editingAssetIndex !== null" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h4 class="text-lg font-semibold mb-4 dark:text-slate-300">
          {{ editingAssetIndex === -1 ? 'Add Asset' : 'Edit Asset' }}
        </h4>

        <form @submit.prevent="saveAsset">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
            <input
              v-model="editingAsset.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
            <textarea
              v-model="editingAsset.description"
              rows="3"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md"
            >
              {{ editingAssetIndex === -1 ? 'Add' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type AssessmentAsset, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const assets = ref<AssessmentAsset[]>([])
const editingAssetIndex = ref<number | null>(null)
const editingAsset = ref<AssessmentAsset>({} as AssessmentAsset)

function addAsset() {
  editingAsset.value = {
    uuid: uuidv4(),
    title: '',
    description: ''
  } as AssessmentAsset
  editingAssetIndex.value = -1
}

function editAsset(index: number) {
  editingAsset.value = { ...assets.value[index] }
  editingAssetIndex.value = index
}

function cancelEdit() {
  editingAssetIndex.value = null
  editingAsset.value = {} as AssessmentAsset
}

async function saveAsset() {
  try {
    if (editingAssetIndex.value === -1) {
      // Add new asset
      assets.value.push({ ...editingAsset.value })
    } else {
      // Update existing asset
      assets.value[editingAssetIndex.value] = { ...editingAsset.value }
    }

    // Save to backend
    const id = route.params.id as string
    await assessmentPlanStore.updateAssessmentAssets(id, assets.value)

    toast.add({
      severity: 'success',
      summary: 'Asset Saved',
      detail: 'Asset has been saved successfully',
      life: 3000
    })

    cancelEdit()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error saving asset',
      detail: 'Failed to save asset. Please try again.',
      life: 3000
    })
  }
}

async function removeAsset(index: number) {
  if (confirm('Are you sure you want to remove this asset?')) {
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
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.get(id)
    assets.value = response.data.assessmentAssets || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading assets',
      detail: 'Failed to load assessment plan assets. Please try again.',
      life: 3000
    })
  }
})
</script>
