<template>
  <div v-if="loading" class="flex justify-center items-center min-h-screen">
    <div class="text-gray-500 dark:text-slate-400">
      Loading Assessment Results...
    </div>
  </div>
  <div v-else-if="error" class="flex justify-center items-center min-h-screen">
    <div class="text-red-500">Error: {{ error }}</div>
  </div>
  <div v-else-if="assessmentResults">
    <PageHeader>{{ assessmentResults.metadata?.title }}</PageHeader>

    <!-- Navigation Tabs -->
    <div class="my-4 border-b border-ccf-300 dark:border-slate-700">
      <nav class="-mb-px flex space-x-8">
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          Overview
        </RouterLink>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/import-ap`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-import-ap'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          Import AP
        </RouterLink>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/results`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-results'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          Results
        </RouterLink>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/local-definitions`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-local-definitions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          Local Definitions
        </RouterLink>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/back-matter`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-back-matter'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          Back Matter
        </RouterLink>
        <RouterLink
          :to="`/assessment-results/${assessmentResults.uuid}/json`"
          class="py-2 px-1 border-b-2 font-medium text-sm"
          :class="[
            $route.name === 'assessment-results-json'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
        >
          JSON
        </RouterLink>
      </nav>
    </div>

    <!-- Content Area -->
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg shadow"
    >
      <RouterView
        :assessment-results="assessmentResults"
        @update="refreshData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import type { AssessmentResults } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const route = useRoute();
const toast = useToast();
const router = useRouter();

const {
  data: assessmentResults,
  execute: loadAssessmentResults,
  isLoading: loading,
  error,
} = useDataApi<AssessmentResults>(
  `/api/oscal/assessment-results/${route.params.id}`,
  null,
  { immediate: false },
);

watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error Loading Assessment Results',
      detail:
        errorResponse.response?.data.errors.body ||
        'An unexpected error occurred.',
      life: 5000,
    });
    router.push({ name: 'assessment-results' });
  }
});

async function refreshData() {
  await loadAssessmentResults();
}

onMounted(() => {
  loadAssessmentResults();
});

// Reload data when the route changes
watch(
  () => route.params.id,
  () => {
    if (route.params.id) {
      loadAssessmentResults();
    }
  },
);
</script>
