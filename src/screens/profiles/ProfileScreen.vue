<script setup lang="ts">
/**
 * A profile (/profiles/:id/...): its title and sections (controls, compliance, JSON) as route
 * tabs.
 */
import DataState from '@/ds/components/DataState/DataState.vue';
import Text from '@/ds/components/Text/Text.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import type { Profile } from '@/oscal';
import { computed, onMounted, ref, watch } from 'vue';
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
  { name: 'profile:view-compliance', label: 'Compliance' },
  // { name: 'profile:view-merge', label: 'Merge' },
  { name: 'profile:view-json', label: 'JSON' },
]);

onMounted(async () => {
  await execute('/api/oscal/profiles/' + route.params.id);
});

const tabs = computed(() =>
  routes.value.map((r) => ({
    label: r.label,
    to: { name: r.name, params: { id: profile.value?.uuid } },
  })),
);
</script>

<template>
  <DataState
    v-if="isLoading || !profile"
    :status="error ? 'error' : 'loading'"
    subject="this profile"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="profile.metadata?.title ?? 'Profile'"
    :tabs="tabs"
  >
    <template #status>
      <Text as="span" variant="caption">{{ profile.uuid }}</Text>
    </template>
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </RecordTemplate>
</template>
