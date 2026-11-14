<script setup lang="ts">
/** A component definition (/component-definitions/:id/...) with its sections as route tabs. */
import DataState from '@/ds/components/DataState/DataState.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { ref, watch, computed } from 'vue';
import type { ComponentDefinition } from '@/oscal';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const id = ref<string>(route.params.id as string);

const {
  data: componentDefinition,
  isLoading,
  error,
} = useDataApi<ComponentDefinition>(
  `/api/oscal/component-definitions/${id.value}`,
);
watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading component definition',
      detail: `Failed to load component definition: ${errorResponse.response?.data.errors.body || 'Unknown error'}. Please check your network connection and try again.`,
      life: 3000,
    });
    router.push({ name: 'component-definitions' });
  }
});

const recordTabs = computed(() => {
  const id = componentDefinition.value?.uuid;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'component-definition-overview', params: { id } },
    },
    {
      label: 'Component templates',
      to: { name: 'component-definition-components', params: { id } },
    },
    {
      label: 'Capabilities',
      to: { name: 'component-definition-capabilities', params: { id } },
    },
    {
      label: 'Back matter',
      to: { name: 'component-definition-back-matter', params: { id } },
    },
    {
      label: 'JSON',
      to: { name: 'component-definition-json', params: { id } },
    },
  ];
});
</script>

<template>
  <DataState
    v-if="isLoading || !componentDefinition"
    :status="error ? 'error' : 'loading'"
    subject="this component definition"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="componentDefinition.metadata?.title ?? 'Component definition'"
    :description="componentDefinition.metadata?.remarks"
    :tabs="recordTabs"
  >
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </RecordTemplate>
</template>
