<script setup lang="ts">
/** Assessment results (/assessment-results/:id/...) with their sections as route tabs. */
import DataState from '@/ds/components/DataState/DataState.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AssessmentResult } from '@/oscal';
import { useToast } from '@/ds/toasts';
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
} = useDataApi<AssessmentResult>(
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

const recordTabs = computed(() => {
  const id = assessmentResults.value?.uuid;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'assessment-results-overview', params: { id } },
    },
    {
      label: 'Results',
      to: { name: 'assessment-results-results', params: { id } },
    },
    { label: 'JSON', to: { name: 'assessment-results-json', params: { id } } },
  ];
});
</script>

<template>
  <DataState
    v-if="loading || !assessmentResults"
    :status="error ? 'error' : 'loading'"
    subject="these assessment results"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="assessmentResults.metadata?.title ?? 'Assessment results'"
    :description="assessmentResults.metadata?.remarks"
    :tabs="recordTabs"
  >
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" @update="refreshData" />
      </KeepAlive>
    </RouterView>
  </RecordTemplate>
</template>
