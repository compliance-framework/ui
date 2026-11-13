<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { SystemSecurityPlan } from '@/oscal';
import SuggestionsView from '@/views/dashboard/SuggestionsView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import { useApiQuery } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Evidence filter suggestions for a system (/dashboards/suggestions/:sspId): AI-suggested filters
 * to review and accept. The body and its actions are the classic view (a legacy island).
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
    <LegacyPage>
      <SuggestionsView embedded />
    </LegacyPage>
  </Stack>
</template>
