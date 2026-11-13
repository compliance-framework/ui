<script setup lang="ts">
/**
 * New evidence filter (/dashboards/create): the page frame is the design system's; the form is
 * the classic filter form (a legacy island). Saving returns to the evidence it searches. The script
 * is the classic page's.
 */
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Evidence filters', to: { name: 'dashboards' } }]"
    />
    <PageHeader
      title="New evidence filter"
      description="Save a search so its evidence can be linked to controls and components."
    />
    <Panel>
      <LegacyPage>
        <FilterForm
          :initial-filter="initialFilter"
          :initial-ssp-id="initialSspId"
          @submit="submit"
        />
      </LegacyPage>
    </Panel>
  </Stack>
</template>
