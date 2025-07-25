<template>
  <div>
    <PageHeader>System Security Plans</PageHeader>

    <div class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900">
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
                  <Badge severity="info" class="ml-2" v-if="systemStore.system.securityPlan?.uuid == ssp.uuid" :value="'Active'" />
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ ssp.metadata.version }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ formatDate(ssp.metadata.lastModified) }}
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                  <div class="flex gap-2 justify-end">
                    <RouterLink
                      :to="`/system-security-plans/${ssp.uuid}`"
                      class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    >
                      View
                    </RouterLink>
                    <button
                      @click="downloadJson(ssp.uuid, ssp.metadata.title)"
                      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md"
                      title="Download Full JSON"
                    >
                      JSON
                    </button>
                    <button
                      @click="systemStore.setSecurityPlan(ssp)"
                      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md"
                    >
                      Set
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
import { useToast } from 'primevue/usetoast'
import { useConfigStore } from '@/stores/config.ts'
import { useSystemStore } from '@/stores/system.ts'
import Badge from '@/volt/Badge.vue'

const sspStore = useSystemSecurityPlanStore()
const configStore = useConfigStore()
const toast = useToast()
const systemStore = useSystemStore();

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

async function downloadJson(uuid: string, title: string): Promise<void> {
  try {
    // Get raw API response without camelCase conversion
    const config = await configStore.getConfig()
    const response = await fetch(
      `${config.API_URL}/api/oscal/system-security-plans/${uuid}/full`,
      {
        credentials: 'include'
      }
    )
    if (!response.ok) {
      throw response
    }
    const data = await response.json()

    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-ssp.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'SSP JSON Downloaded',
      detail: `System Security Plan "${title}" JSON downloaded successfully`,
      life: 3000
    })
  } catch (err) {
    console.error('Error downloading JSON:', err)
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: 'Failed to download SSP JSON. Full SSP export may not be available.',
      life: 3000
    })
  }
}
</script>
