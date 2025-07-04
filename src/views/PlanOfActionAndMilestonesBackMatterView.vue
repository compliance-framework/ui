<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Back Matter</h2>
      <div class="text-sm text-gray-500 dark:text-slate-400">
        {{ resources.length }} resource{{ resources.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading back matter...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading back matter: {{ error }}</p>
    </div>

    <div v-else-if="!resources.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No resources found in back matter.</p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="resource in resources"
        :key="resource.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">
              {{ resource.title || 'Untitled Resource' }}
            </h3>
            <p v-if="resource.description" class="text-gray-600 dark:text-slate-400 mt-2">
              {{ resource.description }}
            </p>
          </div>
          <div class="text-sm text-gray-500 dark:text-slate-400">
            ID: {{ resource.uuid }}
          </div>
        </div>

        <!-- Document IDs -->
        <div v-if="resource.documentIds?.length" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Document Identifiers</h4>
          <div class="space-y-1">
            <div
              v-for="docId in resource.documentIds"
              :key="`${docId.scheme}-${docId.identifier}`"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              <span v-if="docId.scheme" class="font-medium">{{ docId.scheme }}:</span>
              {{ docId.identifier }}
            </div>
          </div>
        </div>

        <!-- Citation -->
        <div v-if="resource.citation" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Citation</h4>
          <div class="bg-gray-50 dark:bg-slate-800 rounded-md p-3">
            <p class="text-sm text-gray-700 dark:text-slate-300">{{ resource.citation.text }}</p>
          </div>
        </div>

        <!-- External Links -->
        <div v-if="resource.rlinks?.length" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">External Links</h4>
          <div class="space-y-2">
            <div
              v-for="rlink in resource.rlinks"
              :key="rlink.href"
              class="flex items-center gap-2"
            >
              <a
                :href="rlink.href"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm break-all"
              >
                {{ rlink.href }}
              </a>
              <span v-if="rlink.mediaType" class="text-xs text-gray-500 dark:text-slate-400">
                ({{ rlink.mediaType }})
              </span>
            </div>
          </div>
        </div>

        <!-- Base64 Content -->
        <div v-if="resource.base64" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Embedded Content</h4>
          <div class="bg-gray-50 dark:bg-slate-800 rounded-md p-3">
            <div class="text-sm text-gray-600 dark:text-slate-400 mb-2">
              <span v-if="resource.base64.filename">Filename: {{ resource.base64.filename }}</span>
              <span v-if="resource.base64.mediaType" class="ml-2">Type: {{ resource.base64.mediaType }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-slate-500 font-mono break-all">
              {{ resource.base64.value ? `${resource.base64.value.substring(0, 100)}...` : 'No content' }}
            </div>
          </div>
        </div>

        <!-- Properties -->
        <div v-if="resource.props?.length" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Properties</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="prop in resource.props"
              :key="`${prop.name}-${prop.value}`"
              class="text-sm"
            >
              <span class="font-medium text-gray-600 dark:text-slate-400">{{ prop.name }}:</span>
              <span class="text-gray-700 dark:text-slate-300 ml-1">{{ prop.value }}</span>
            </div>
          </div>
        </div>

        <!-- Remarks -->
        <div v-if="resource.remarks" class="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-2">Remarks</h4>
          <p class="text-sm text-gray-600 dark:text-slate-400">{{ resource.remarks }}</p>
        </div>
      </div>
    </div>

    <!-- Feature Notice -->
    <div class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Read-Only Mode:</strong> Back Matter functionality is currently disabled. The backend endpoint is not yet implemented.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { type BackMatter, type Resource, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const backMatter = ref<BackMatter | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const resources = computed(() => {
  return backMatter.value?.resources || []
})

onMounted(async () => {
  await loadBackMatter()
})

async function loadBackMatter() {
  const id = route.params.id as string
  
  try {
    loading.value = true
    const response = await poamStore.getBackMatter(id)
    backMatter.value = response.data
  } catch (err) {
    console.error('Error loading back matter:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}
</script> 