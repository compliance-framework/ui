<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Locations</h2>
      <button
        disabled
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create functionality is currently disabled"
      >
        Add Location
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading locations...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading locations: {{ error }}</p>
    </div>

    <div v-else-if="!locations.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No locations found.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="location in locations"
        :key="location.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ location.title || 'Unnamed Location' }}</h3>
            
            <div v-if="location.address" class="mt-2 text-sm text-gray-600 dark:text-slate-400">
              <div v-if="location.address.addrLines?.length">
                <div v-for="line in location.address.addrLines" :key="line">{{ line }}</div>
              </div>
              <div v-if="location.address.city || location.address.state || location.address.postalCode">
                {{ [location.address.city, location.address.state, location.address.postalCode].filter(Boolean).join(', ') }}
              </div>
              <div v-if="location.address.country">{{ location.address.country }}</div>
            </div>
            
            <div v-if="location.emailAddresses?.length" class="mt-2">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Email:</strong> {{ location.emailAddresses.join(', ') }}
              </p>
            </div>
            
            <div v-if="location.telephoneNumbers?.length" class="mt-1">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Phone:</strong> {{ location.telephoneNumbers.map(t => t.number).join(', ') }}
              </p>
            </div>
            
            <div v-if="location.urls?.length" class="mt-1">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>URLs:</strong> {{ location.urls.join(', ') }}
              </p>
            </div>
          </div>
          
          <div class="ml-4">
            <button
              disabled
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit functionality is currently disabled"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Notice -->
    <div class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Read-Only Mode:</strong> Edit and create functionality for locations is currently disabled. You can view existing locations and their details.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type Location, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const locations = ref<Location[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await poamStore.getLocations(id)
    locations.value = response.data
  } catch (err) {
    console.error('Error loading locations (endpoint not implemented):', err)
    error.value = 'Locations endpoint not yet implemented in backend'
  } finally {
    loading.value = false
  }
})
</script> 