<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useAiConfigStore } from '@/stores/ai-config';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

/**
 * Diagnostics (/admin/diagnostics, admin): notification delivery and, where enabled, AI
 * suggestion runs, as route tabs. Both sections are classic islands.
 */
const aiConfig = useAiConfigStore();

const tabs = computed(() => [
  { label: 'Notifications', to: { name: 'admin-diagnostics-notifications' } },
  ...(aiConfig.dashboardSuggestionsEnabled
    ? [
        {
          label: 'AI suggestions',
          to: { name: 'admin-diagnostics-ai-suggestions' },
        },
      ]
    : []),
]);

onMounted(() => {
  void aiConfig.fetchDashboardSuggestionsConfig();
});
</script>

<template>
  <RecordTemplate
    title="Diagnostics"
    description="How notifications and AI suggestions are running."
    :tabs="tabs"
  >
    <LegacyPage>
      <RouterView />
    </LegacyPage>
  </RecordTemplate>
</template>
