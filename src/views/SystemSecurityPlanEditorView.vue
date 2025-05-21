<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4">
    {{ systemSecurityPlan.metadata?.remarks }}
  </p>

  <div
    class="mt-4 border-b dark:border-slate-800"
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
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import {
  type Diagram,
  type DiagramGrouping,
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { RouterView, useRoute } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { DataResponse } from '@/stores/types.ts'
import { v4 } from 'uuid'

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);
const authorizationBoundary = ref<DiagramGrouping>({} as DiagramGrouping);
const networkArchitecture = ref<DiagramGrouping>({} as DiagramGrouping);
const dataFlow = ref<DiagramGrouping>({} as DiagramGrouping);

onMounted(() => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
  sspStore.getCharacteristicsAuthorizationBoundary(id).then((data: DataResponse<DiagramGrouping>) => {
    authorizationBoundary.value = data.data;
    if (!data.data?.diagrams?.length) {
      authorizationBoundary.value.diagrams = [{
        uuid: v4(),
      } as Diagram]
    }
  })
  sspStore.getCharacteristicsNetworkArchitecture(id).then((data) => {
    networkArchitecture.value = data.data;
  })
  sspStore.getCharacteristicsDataFlow(id).then((data) => {
    dataFlow.value = data.data;
  })
});
</script>

<style scoped>
.router-link-exact-active {
  @apply bg-none border-b-2 dark:bg-slate-900
}
</style>
