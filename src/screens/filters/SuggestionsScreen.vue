<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { SystemSecurityPlan } from '@/oscal';
import FilterSuggestions from './FilterSuggestions.vue';
import { useApiQuery } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Evidence filter suggestions for a system (/dashboards/suggestions/:sspId): AI-suggested filters
 * to review and accept.
 */
const route = useRoute();
const plan = useApiQuery<SystemSecurityPlan>(
  `/api/oscal/system-security-plans/${String(route.params.sspId)}`,
);
const description = computed(() =>
  plan.data.value
    ? `Suggested evidence filters for ${plan.data.value.metadata.title}.`
    : 'Suggested evidence filters for this system.',
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Evidence filters', to: { name: 'dashboards' } }]"
    />
    <PageHeader title="Filter suggestions" :description="description" />
    <FilterSuggestions />
  </Stack>
</template>
