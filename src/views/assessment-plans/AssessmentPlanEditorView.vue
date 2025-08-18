<template>
  <PageHeader>Assessment Plan</PageHeader>
  <template v-if="isLoading">
    <p>Loading assessment plans...</p>
  </template>
  <template v-else-if="error">
    <p class="text-red-500">
      Error loading assessment plan:
      {{
        (error as AxiosError<{ message: string }>).response?.data.message ||
        'Unknown error'
      }}
    </p>
  </template>
  <template v-if="assessmentPlan">
    <PageSubHeader>{{ assessmentPlan.metadata?.title }}</PageSubHeader>

    <p class="mt-4" v-if="assessmentPlan.metadata?.remarks">
      {{ assessmentPlan.metadata.remarks }}
    </p>

    <div
      class="mt-4 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap"
    >
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'assessment-plan-overview',
          params: { id: assessmentPlan.uuid },
        }"
      >
        Overview
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'assessment-plan-tasks',
          params: { id: assessmentPlan.uuid },
        }"
      >
        Tasks
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'assessment-plan-subjects',
          params: { id: assessmentPlan.uuid },
        }"
      >
        Subjects
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'assessment-plan-assets',
          params: { id: assessmentPlan.uuid },
        }"
      >
        Assets
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'assessment-plan-json',
          params: { id: assessmentPlan.uuid },
        }"
      >
        JSON
      </RouterLink>
    </div>

    <div class="my-4">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
  </template>
</template>

<script setup lang="ts">
import { watch, ref, toValue } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { AssessmentPlan } from '@/stores/assessment-plans.ts';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';

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
</script>

<style scoped>
.router-link-exact-active {
  background: none;
  border-bottom: 2px solid;
}

.dark .router-link-exact-active {
  background-color: rgb(15 23 42); /* slate-900 */
}
</style>
