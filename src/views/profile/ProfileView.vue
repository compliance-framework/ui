<template>
  <template v-if="isLoading">
    <PageHeader>Loading profile...</PageHeader>
  </template>
  <template v-else>
    <PageHeader>{{ profile?.metadata?.title }}</PageHeader>
    <PageSubHeader>{{ profile?.uuid }}</PageSubHeader>

    <Tabs value="main">
      <TabList>
        <Tab
          v-for="route in routes"
          :key="route.name"
          :value="route.name"
          as="div"
        >
          <RouterLink :to="{ name: route.name, params: { id: profile?.uuid } }">
            {{ route.label }}
          </RouterLink>
        </Tab>
      </TabList>
    </Tabs>

    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </template>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';

import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';

import type { Profile } from '@/oscal';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { data: profile, error, isLoading, execute } = useDataApi<Profile>();

watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading profile',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the profile data.',
      life: 3000,
    });
    router.push({ name: 'profile-list' });
  }
});

const routes = ref([
  { name: 'profile:view-controls', label: 'Controls' },
  { name: 'profile:view-merge', label: 'Merge' },
  { name: 'profile:view-json', label: 'JSON' },
]);

onMounted(async () => {
  await execute('/api/oscal/profiles/' + route.params.id);
});
</script>

<style scoped>
@reference "@/assets/main.css";

.router-link-exact-active {
  @apply bg-none;
}
</style>
