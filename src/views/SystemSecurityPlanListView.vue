<template>
  <div>
    <PageHeader>System Security Plans</PageHeader>
    
    <div class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Title
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Version
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Last Modified
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ccf-300 bg-white dark:divide-slate-700 dark:bg-slate-900">
            <template v-if="loading">
              <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
                  Loading...
                </td>
              </tr>
            </template>
            <template v-else-if="error">
              <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                  Error loading System Security Plans: {{ error }}
                </td>
              </tr>
            </template>
            <template v-else-if="!systemSecurityPlans?.length">
              <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
                  No System Security Plans found.
                </td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="ssp in systemSecurityPlans"
                :key="ssp.uuid"
                class="hover:bg-zinc-50 dark:hover:bg-slate-800"
              >
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300">
                  <RouterLink
                    :to="`/system-security-plans/${ssp.uuid}`"
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {{ ssp.metadata.title }}
                  </RouterLink>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ ssp.metadata.version }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ formatDate(ssp.metadata.lastModified) }}
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <RouterLink
                      :to="`/system-security-plans/${ssp.uuid}`"
                      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View
                    </RouterLink>
                    <button
                      @click="downloadJson(ssp.uuid)"
                      class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                    >
                      JSON
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type SystemSecurityPlan, useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'

const sspStore = useSystemSecurityPlanStore()

const systemSecurityPlans = ref<SystemSecurityPlan[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const response = await sspStore.list()
    systemSecurityPlans.value = response.data
  } catch (err) {
    console.error('Error loading System Security Plans:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

async function downloadJson(uuid: string): Promise<void> {
  try {
    const response = await sspStore.full(uuid)
    const dataStr = JSON.stringify(response.data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ssp-${uuid}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error downloading JSON:', err)
  }
}
</script>
