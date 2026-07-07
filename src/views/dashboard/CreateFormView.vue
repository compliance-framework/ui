<template>
  <PageHeader> New Dashboard </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <FilterForm :initial-filter="initialFilter" @submit="submit" />
  </PageCard>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import FilterForm from '@/views/dashboard/partials/FilterForm.vue';
import type { DashboardCreate } from '@/stores/filters.ts';
import { serializeFilter } from '@/parsers/labelfilter.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const router = useRouter();
const route = useRoute();

const initialFilter = ref<string>((route.query['filter'] as string) ?? '');

const { execute: createDashboard } = useDataApi<DashboardCreate>(
  '/api/filters',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function submit(payload: DashboardCreate) {
  try {
    await createDashboard({ data: payload });
    return router.push({
      name: 'evidence:index',
      query: { filter: serializeFilter(payload.filter) },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
