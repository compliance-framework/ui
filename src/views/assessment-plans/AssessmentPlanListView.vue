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
      class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
    >
      <table class="table-auto w-full rounded-full dark:text-slate-300">
        <tbody>
          <tr
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
            v-for="assessmentPlan in assessmentPlans"
            :key="assessmentPlan.uuid"
          >
            <td class="py-3 px-4 whitespace-nowrap grow">
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

            <td class="py-2 px-2 text-right whitespace-nowrap">
              <div class="flex gap-2">
                <TertiaryButton
                  :to="{
                    name: 'assessment-plan-overview',
                    params: { id: assessmentPlan.uuid },
                  }"
                  >View
                </TertiaryButton>
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
      <RouterLink
        :to="{ name: 'assessment-plan-create' }"
        class="inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative px-3 py-2 gap-2 rounded-md disabled:pointer-events-none disabled:opacity-60 transition-colors duration-200 bg-surface-100 hover:bg-surface-200 active:bg-surface-300 border border-surface-100 hover:border-surface-200 active:border-surface-300 text-surface-700 no-underline"
        >Create Assessment Plan
      </RouterLink>
    </div>
  </template>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import TertiaryButton from '@/components/TertiaryButton.vue';
import type { AssessmentPlan } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system.ts';
import Badge from '@/volt/Badge.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import decamelizeKeys from 'decamelize-keys';
import { computed } from 'vue';

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
