<script setup lang="ts">
/** An assessment plan (/assessment-plans/:id/...) with its sections as route tabs. */
import DataState from '@/ds/components/DataState/DataState.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { watch, ref, toValue, computed } from 'vue';
import type { AssessmentPlan } from '@/oscal';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from '@/ds/toasts';

const route = useRoute();
const id = ref<string>(route.params.id as string);
const toast = useToast();
const router = useRouter();

const {
  data: assessmentPlan,
  error,
  isLoading,
} = useDataApi<AssessmentPlan>(`/api/oscal/assessment-plans/${toValue(id)}`);
watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<{ message?: string }>;
    toast.add({
      severity: 'error',
      summary: 'Failed to load assessment plan',
      detail: `Error: ${errorResponse.response?.data.message || 'Unknown error'}`,
      life: 3000,
    });
    router.push({ name: 'assessment-plans' });
  }
});

const recordTabs = computed(() => {
  const id = assessmentPlan.value?.uuid;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'assessment-plan-overview', params: { id } },
    },
    { label: 'Tasks', to: { name: 'assessment-plan-tasks', params: { id } } },
    { label: 'JSON', to: { name: 'assessment-plan-json', params: { id } } },
  ];
});
</script>

<template>
  <DataState
    v-if="isLoading || !assessmentPlan"
    :status="error ? 'error' : 'loading'"
    subject="this assessment plan"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="assessmentPlan.metadata?.title ?? 'Assessment plan'"
    :description="assessmentPlan.metadata?.remarks"
    :tabs="recordTabs"
  >
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </RecordTemplate>
</template>
