<script setup lang="ts">
/** A POA&M document (/plan-of-action-and-milestones/:id/...) with its sections as route tabs; the sections are classic islands until rebuilt. */
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { ref, watch, computed } from 'vue';
import type { POAM } from '@/oscal';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const router = useRouter();
const toast = useToast();
const route = useRoute();
const id = ref<string>(route.params.id as string);

const {
  data: planOfActionAndMilestones,
  error,
  isLoading,
} = useDataApi<POAM>(`/api/oscal/plan-of-action-and-milestones/${id.value}`);
watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading POAM',
      detail: `Failed to load Plan of Action and Milestones: ${errorResponse.response?.data.errors.body}. Please try again later.`,
      life: 3000,
    });
    router.push({ name: 'plan-of-action-and-milestones' });
  }
});

const recordTabs = computed(() => {
  const id = planOfActionAndMilestones.value?.uuid;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'plan-of-action-and-milestones-overview', params: { id } },
    },
    {
      label: 'POA&M items',
      to: { name: 'plan-of-action-and-milestones-poam-items', params: { id } },
    },
    {
      label: 'Import SSP',
      to: { name: 'plan-of-action-and-milestones-import-ssp', params: { id } },
    },
    {
      label: 'System ID',
      to: { name: 'plan-of-action-and-milestones-system-id', params: { id } },
    },
    {
      label: 'Local definitions',
      to: {
        name: 'plan-of-action-and-milestones-local-definitions',
        params: { id },
      },
    },
    {
      label: 'Observations',
      to: {
        name: 'plan-of-action-and-milestones-observations',
        params: { id },
      },
    },
    {
      label: 'Risks',
      to: { name: 'plan-of-action-and-milestones-risks', params: { id } },
    },
    {
      label: 'Findings',
      to: { name: 'plan-of-action-and-milestones-findings', params: { id } },
    },
    {
      label: 'Back matter',
      to: { name: 'plan-of-action-and-milestones-back-matter', params: { id } },
    },
    {
      label: 'JSON',
      to: { name: 'plan-of-action-and-milestones-json', params: { id } },
    },
  ];
});
</script>

<template>
  <DataState
    v-if="isLoading || !planOfActionAndMilestones"
    :status="error ? 'error' : 'loading'"
    subject="this POA&M"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="
      planOfActionAndMilestones.metadata?.title ??
      'Plan of Action and Milestones'
    "
    :description="planOfActionAndMilestones.metadata?.remarks"
    :tabs="recordTabs"
  >
    <LegacyPage>
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </LegacyPage>
  </RecordTemplate>
</template>
