<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4">
    {{ systemSecurityPlan.metadata?.remarks }}
  </p>

  <div
    class="mt-4 border-b border-ccf-300 dark:border-slate-800"
  >
    <RouterLink class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" :to="{name: 'system-security-plans-characteristics', params: {id: systemSecurityPlan.uuid}}">Characteristics</RouterLink>
    <RouterLink class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" :to="{name: 'system-security-plans-diagrams', params: {id: systemSecurityPlan.uuid}}">Diagrams</RouterLink>
    <RouterLink class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" :to="{name: 'system-security-plans-system-implementation', params: {id: systemSecurityPlan.uuid}}">System Implementation</RouterLink>
    <RouterLink class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" :to="{name: 'system-security-plans-control-implementation', params: {id: systemSecurityPlan.uuid}}">Control Implementation</RouterLink>
  </div>

  <div class="mt-4">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, toValue } from 'vue'
import PageHeader from '@/components/PageHeader.vue';
import {
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { RouterView, useRoute, useRouter } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue';
import { useToast } from 'primevue/usetoast';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = ref<string>(route.params.id as string);
const sspStore = useSystemSecurityPlanStore();
const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);

onMounted(() => {
  sspStore.get(toValue(id)).then((data) => {
    systemSecurityPlan.value = data.data;
  }).catch(async (response) => {
    const error = await response.json() as ErrorResponse<ErrorBody>;
    toast.add({
      severity: 'error',
      summary: `Error loading system security plan - ${response.statusText}`,
      detail: error.errors?.body ?? 'An error occurred while loading the system security plan.',
      life: 3000
    });
    router.push({ name: 'system-security-plans' });
  });
});
</script>

<style scoped>
@reference "@/assets/main.css";

.router-link-exact-active {
  @apply bg-none border-b-2 dark:bg-slate-900
}
</style>
