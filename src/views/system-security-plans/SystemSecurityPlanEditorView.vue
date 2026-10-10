<template>
  <template v-if="isLoading">
    <PageHeader>System Security Plan</PageHeader>
    <PageSubHeader>Loading...</PageSubHeader>
  </template>
  <template v-else-if="error">
    <PageHeader>System Security Plan</PageHeader>
    <PageSubHeader class="text-red-500"
      >Error loading System Security Plan: {{ error }}</PageSubHeader
    >
  </template>
  <template v-if="systemSecurityPlan">
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <div>
      <PageHeader>System Security Plan</PageHeader>
      <Tabs :value="activeRoute">
        <TabList>
          <Tab
            v-for="tab in tabs"
            :key="tab.label"
            :value="tab.route"
            as="div"
            class="flex items-center gap-2"
          >
            <RouterLink :to="{ name: tab.route, params: { id: sspId } }">
              {{ tab.label }}
            </RouterLink>
          </Tab>
        </TabList>
      </Tabs>
    </div>

    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { SystemSecurityPlan } from '@/oscal';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import { sspSectionTabRoutes } from '@/constants/ssp-section-tabs';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const sspId = computed(() => String(route.params.id || ''));
const activeRoute = ref(route.name as string);
const tabs = sspSectionTabRoutes('system-security-plan-');

const {
  data: systemSecurityPlan,
  isLoading,
  error,
  execute: loadSystemSecurityPlan,
} = useDataApi<SystemSecurityPlan>(null, null, {
  immediate: false,
});

watch(
  sspId,
  async (id) => {
    if (!id) {
      return;
    }

    await loadSystemSecurityPlan(`/api/oscal/system-security-plans/${id}`);
  },
  { immediate: true },
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
