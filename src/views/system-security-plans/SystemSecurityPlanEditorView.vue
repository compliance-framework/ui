<template>
  <PageHeader>System Security Plan</PageHeader>
  <template v-if="isLoading">
    <PageSubHeader>Loading...</PageSubHeader>
  </template>
  <template v-else-if="error">
    <PageSubHeader class="text-red-500"
      >Error loading System Security Plan: {{ error }}</PageSubHeader
    >
  </template>
  <template v-if="systemSecurityPlan">
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <p class="mt-4" v-if="systemSecurityPlan.metadata?.remarks">
      {{ systemSecurityPlan.metadata.remarks }}
    </p>

    <div
      class="mt-4 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap"
    >
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{ name: 'system-security-plan-overview', params: { id: id } }"
      >
        Overview
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'system-security-plan-characteristics',
          params: { id: id },
        }"
      >
        System Characteristics
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'system-security-plan-system-implementation',
          params: { id: id },
        }"
      >
        System Implementation
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'system-security-plan-control-implementation',
          params: { id: id },
        }"
      >
        Control Implementation
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{ name: 'system-security-plan-json', params: { id: id } }"
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
import { ref, toValue, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { SystemSecurityPlan } from '@/stores/system-security-plans.ts';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = ref<string>(route.params.id as string);

const {
  data: systemSecurityPlan,
  isLoading,
  error,
} = useDataApi<SystemSecurityPlan>(
  `/api/oscal/system-security-plans/${toValue(id)}`,
);
watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading System Security Plan',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the System Security Plan.',
      life: 3000,
    });
    router.push({ name: 'system-security-plans' });
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
