<template>
  <div>
    <PageHeader>Assessment Results</PageHeader>

    <div
      class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Title
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Version
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Last Modified
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody
            class="divide-y divide-ccf-300 bg-white dark:divide-slate-700 dark:bg-slate-900"
          >
            <template v-if="loading">
              <tr>
                <td
                  colspan="4"
                  class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
                >
                  Loading...
                </td>
              </tr>
            </template>
            <template v-else-if="error">
              <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                  Error loading Assessment Results: {{ error }}
                </td>
              </tr>
            </template>
            <template v-else-if="!assessmentResults?.length">
              <tr>
                <td
                  colspan="4"
                  class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
                >
                  No Assessment Results found.
                </td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="ar in assessmentResults"
                :key="ar.uuid"
                class="hover:bg-zinc-50 dark:hover:bg-slate-800"
              >
                <td
                  class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
                >
                  <RouterLink
                    :to="`/assessment-results/${ar.uuid}`"
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {{ ar.metadata?.title }}
                  </RouterLink>
                  <Badge
                    severity="info"
                    class="ml-2"
                    v-if="systemStore.system.assessmentResults?.uuid == ar.uuid"
                    :value="'Active'"
                  />
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ ar.metadata?.version }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                  {{ formatDate(ar.metadata?.lastModified) }}
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                  <div class="flex gap-2 justify-end">
                    <TertiaryButton :to="`/assessment-results/${ar.uuid}`">
                      View
                    </TertiaryButton>
                    <PrimaryButton
                      @click="downloadJson(ar.uuid, ar.metadata?.title)"
                      title="Download Full JSON"
                    >
                      JSON
                    </PrimaryButton>
                    <PrimaryButton
                      @click="systemStore.setAssessmentResults(ar)"
                    >
                      Set
                    </PrimaryButton>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Button -->
    <div class="mt-4">
      <PrimaryButton to="/assessment-results/create">
        Create New Assessment Results
      </PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import type { AssessmentResult } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config.ts';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';

const configStore = useConfigStore();
const toast = useToast();
const systemStore = useSystemStore();

const {
  data: assessmentResults,
  error,
  isLoading: loading,
} = useDataApi<AssessmentResult[]>('/api/oscal/assessment-results');

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

async function downloadJson(uuid: string, title: string): Promise<void> {
  try {
    // Get raw API response without camelCase conversion
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-results/${uuid}/full`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw response;
    }
    const data = await response.json();

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-assessment-results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Assessment Results JSON Downloaded',
      detail: `Assessment Results "${title}" JSON downloaded successfully`,
      life: 3000,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download Assessment Results JSON: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
