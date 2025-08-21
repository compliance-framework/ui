<template>
  <PageCard>
    <pre class="text-sm">{{ decamelizeKeys(profile ?? {}) }}</pre>
  </PageCard>
</template>

<script setup lang="ts">
import PageCard from '@/components/PageCard.vue';
import { useRoute } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { Profile } from '@/stores/types';
import decamelizeKeys from 'decamelize-keys';
import { onActivated } from 'vue';

const route = useRoute();
const { data: profile, execute: getFullProfile } = useDataApi<Profile>(
  `/api/oscal/profiles/${route.params.id}/full`,
  null,
  { immediate: false },
);

onActivated(() => {
  getFullProfile();
});
</script>
