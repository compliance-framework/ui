<template>
  <PageHeader> New Evidence Filter </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <FilterForm
      :initial-filter="initialFilter"
      :initial-ssp-id="initialSspId"
      @submit="submit"
    />
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
import { useDataApi } from '@/composables/axios';

const router = useRouter();
const route = useRoute();

const initialFilter = ref<string>((route.query['filter'] as string) ?? '');
// Set when the search was saved from This System > Evidence: pre-select that SSP and
// go back to that page afterwards.
const initialSspId =
  typeof route.query['sspId'] === 'string' ? route.query['sspId'] : null;

const { execute: createDashboard } = useDataApi<DashboardCreate>(
  '/api/filters',
  {
    method: 'POST',
    // /api/filters is a camelCase API: no decamelizeKeys, or followSspScope and sspId
    // would go out kebab-cased.
  },
  { immediate: false },
);

async function submit(payload: DashboardCreate) {
  try {
    await createDashboard({ data: payload });
    return router.push({
      name: initialSspId ? 'system:evidence' : 'evidence:index',
      query: { filter: serializeFilter(payload.filter) },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
