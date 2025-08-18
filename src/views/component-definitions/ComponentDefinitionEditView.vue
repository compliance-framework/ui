<template>
  <PageHeader>Edit Component Definition</PageHeader>
  <template v-if="isLoading">
    <PageSubHeader>Loading component definition...</PageSubHeader>
  </template>
  <template v-else-if="error">
    <PageSubHeader>Error loading component definition</PageSubHeader>
    <p class="mt-4">Please check your network connection or try again later.</p>
  </template>
  <template v-else-if="componentDefinition">
    <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

    <PageCard class="mt-8 w-1/2">
      <div
        class="mb-4 p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-200 rounded"
      >
        <strong>Component Definition Properties:</strong> Currently showing
        read-only view of the main component definition container. Individual
        components and capabilities can be edited through their respective
        sections.
      </div>

      <div v-if="componentDefinition.metadata" class="space-y-4">
        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >ID</label
          >
          <div
            class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
          >
            <span class="text-gray-600 dark:text-slate-400 font-mono">{{
              componentDefinition.uuid
            }}</span>
          </div>
        </div>

        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >Title</label
          >
          <div
            class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
          >
            <span class="text-gray-900 dark:text-slate-300">{{
              componentDefinition.metadata.title
            }}</span>
          </div>
        </div>

        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >Remarks</label
          >
          <div
            class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md min-h-[60px]"
          >
            <span class="text-gray-900 dark:text-slate-300">{{
              componentDefinition.metadata.remarks || 'No remarks'
            }}</span>
          </div>
        </div>

        <div class="text-right">
          <SecondaryButton type="button" @click="cancel">
            Back to Overview
          </SecondaryButton>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          Loading component definition...
        </p>
      </div>
    </PageCard>
  </template>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { type ComponentDefinition } from '@/stores/component-definitions.ts';
import { useRouter, useRoute } from 'vue-router';
import PageCard from '@/components/PageCard.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { watch } from 'vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const {
  data: componentDefinition,
  isLoading,
  error,
} = useDataApi<ComponentDefinition>(
  `/api/oscal/component-definitions/${route.params.id}`,
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

function cancel() {
  router.push({
    name: 'component-definition-overview',
    params: { id: route.params.id },
  });
}
</script>
