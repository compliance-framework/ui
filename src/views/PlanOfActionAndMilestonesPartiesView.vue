<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">Parties</h2>
      <button
        disabled
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create functionality is currently disabled"
      >
        Add Party
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading parties...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading parties: {{ error }}</p>
    </div>

    <div v-else-if="!parties.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No parties found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="party in parties"
        :key="party.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">{{ party.name }}</h3>
            <p v-if="party.shortName" class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ party.shortName }}</p>
            <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">Type: {{ party.type }}</p>
            
            <div v-if="party.emailAddresses?.length" class="mt-2">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Email:</strong> {{ party.emailAddresses.join(', ') }}
              </p>
            </div>
            
            <div v-if="party.telephoneNumbers?.length" class="mt-1">
              <p class="text-sm text-gray-600 dark:text-slate-400">
                <strong>Phone:</strong> {{ party.telephoneNumbers.map(t => t.number).join(', ') }}
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
        <strong>Read-Only Mode:</strong> Edit and create functionality for parties is currently disabled. You can view existing parties and their details.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { type Party, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'

const route = useRoute()
const poamStore = usePlanOfActionAndMilestonesStore()

const parties = ref<Party[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  
  try {
    const response = await poamStore.getParties(id)
    parties.value = response.data
  } catch (err) {
    console.error('Error loading parties (endpoint not implemented):', err)
    error.value = 'Parties endpoint not yet implemented in backend'
  } finally {
    loading.value = false
  }
})
</script> 