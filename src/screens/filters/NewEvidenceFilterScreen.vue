<script setup lang="ts">
/**
 * New evidence filter (/dashboards/create): the filter form, prefilled from `?filter=` and, when
 * saved from This System > Evidence, `?sspId=`. Saving returns to the evidence it searches.
 */
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import type { DashboardCreate } from '@/stores/filters.ts';
import { serializeFilter } from '@/parsers/labelfilter.ts';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import EvidenceFilterForm from './EvidenceFilterForm.vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const initialFilter = (route.query['filter'] as string) ?? '';
// Set when the search was saved from This System > Evidence: pre-select that system and go back
// to that page afterwards.
const initialSspId =
  typeof route.query['sspId'] === 'string' ? route.query['sspId'] : null;

function saved(payload: DashboardCreate) {
  toast.add({
    severity: 'success',
    summary: 'Filter created',
    detail: `${payload.name} was saved.`,
    life: 3000,
  });
  return router.push({
    name: initialSspId ? 'system:evidence' : 'evidence:index',
    query: { filter: serializeFilter(payload.filter) },
  });
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
      <EvidenceFilterForm
        :initial-filter="initialFilter"
        :initial-ssp-id="initialSspId"
        @saved="saved"
      />
    </Panel>
  </Stack>
</template>
