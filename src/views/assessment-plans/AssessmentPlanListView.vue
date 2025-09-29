<template>
  <PageHeader>Assessment Plans</PageHeader>
  <template v-if="isLoading">
    <p>Loading assessment plans...</p>
  </template>
  <template v-else-if="error">
    <p class="text-red-500">
      Error loading assessment plans: {{ errorMessage }}
    </p>
  </template>
  <template v-if="assessmentPlans">
    <div
      class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <table class="table-auto w-full dark:text-slate-300">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr class="border-b border-ccf-300 dark:border-slate-700">
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Title
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
            v-for="assessmentPlan in assessmentPlans"
            :key="assessmentPlan.uuid"
          >
            <td
              class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
            >
              {{ assessmentPlan.metadata.title }}
              <Badge
                severity="info"
                class="ml-2"
                v-if="
                  systemStore.system.assessmentPlan?.uuid == assessmentPlan.uuid
                "
                :value="'Active'"
              />
            </td>

            <td class="px-6 py-4 text-right text-sm font-medium">
              <div class="flex gap-2 justify-end">
                <RouterLinkButton
                  :to="{
                    name: 'assessment-plan-overview',
                    params: { id: assessmentPlan.uuid },
                  }"
                  >View
                </RouterLinkButton>
                <PrimaryButton
                  @click="
                    downloadJSON(
                      assessmentPlan.uuid,
                      assessmentPlan.metadata.title,
                    )
                  "
                  title="Download Full JSON"
                >
                  JSON
                </PrimaryButton>
                <PrimaryButton
                  @click="systemStore.setAssessmentPlan(assessmentPlan)"
                >
                  Set
                </PrimaryButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4">
      <RouterLinkButton :to="{ name: 'assessment-plan-create' }">
        Create Assessment Plan
      </RouterLinkButton>
    </div>
  </template>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import type { AssessmentPlan } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system.ts';
import Badge from '@/volt/Badge.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import decamelizeKeys from 'decamelize-keys';
import { computed } from 'vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';

const toast = useToast();
const systemStore = useSystemStore();

const {
  data: assessmentPlans,
  error,
  isLoading,
} = useDataApi<AssessmentPlan[]>('/api/oscal/assessment-plans');
const { data: apJSON, execute: executeDownloadJSON } =
  useDataApi<AssessmentPlan>();

const errorMessage = computed(() => {
  const err = error as unknown as AxiosError<ErrorResponse<ErrorBody>>;
  return err.response?.data.errors.body || 'Unknown error';
});

async function downloadJSON(id: string, title: string) {
  try {
    await executeDownloadJSON(`/api/oscal/assessment-plans/${id}/full`);
    const jsonData = JSON.stringify(
      decamelizeKeys(apJSON.value!, { separator: '-', deep: true }),
      null,
      2,
    );

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-assessment-plan.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: `Assessment plan JSON downloaded successfully`,
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download assessment plan JSON: ${errorResponse.response?.data.errors.body || 'Unknown error'}`,
      life: 3000,
    });
  }
}
</script>
