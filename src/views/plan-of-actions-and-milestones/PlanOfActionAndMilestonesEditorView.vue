<template>
  <div>
    <PageHeader>Plan of Action and Milestones</PageHeader>
    <template v-if="isLoading">
      <div class="text-center text-gray-500 dark:text-slate-400">
        Loading...
      </div>
    </template>
    <template v-else-if="error">
      <div class="text-center text-red-500">
        Error loading Plan of Action and Milestones: {{ error }}
      </div>
    </template>
    <template v-else-if="planOfActionAndMilestones">
      <PageSubHeader>{{
        planOfActionAndMilestones.metadata?.title
      }}</PageSubHeader>

      <div class="mt-4 text-gray-600 dark:text-slate-400">
        {{ planOfActionAndMilestones.metadata?.remarks }}
      </div>

      <div class="mt-6 border-b border-ccf-300 dark:border-slate-700">
        <nav class="-mb-px flex space-x-8">
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            exact-active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Overview
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/poam-items`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            POAM Items
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/import-ssp`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Import SSP
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/system-id`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            System ID
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/local-definitions`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Local Definitions
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/observations`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Observations
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/risks`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Risks
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/findings`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Findings
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/back-matter`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            Back Matter
          </RouterLink>
          <RouterLink
            :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/json`"
            class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
            active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            JSON View
          </RouterLink>
        </nav>
      </div>

      <div class="mt-6">
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
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
</script>
