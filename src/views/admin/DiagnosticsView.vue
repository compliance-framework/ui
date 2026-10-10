<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';
import { useAiConfigStore } from '@/stores/ai-config';

const route = useRoute();
const aiConfig = useAiConfigStore();

const tabs = computed(() => [
  {
    name: 'admin-diagnostics-notifications',
    label: 'Notifications',
  },
  ...(aiConfig.dashboardSuggestionsEnabled
    ? [
        {
          name: 'admin-diagnostics-ai-suggestions',
          label: 'AI Suggestions',
        },
      ]
    : []),
]);

onMounted(() => {
  void aiConfig.fetchDashboardSuggestionsConfig();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <PageHeader>Diagnostics</PageHeader>
      <PageSubHeader>
        Operational diagnostics for notifications and AI suggestions.
      </PageSubHeader>
    </div>

    <Message
      v-if="!aiConfig.dashboardSuggestionsConfigFetched"
      severity="info"
      variant="outlined"
    >
      Loading AI diagnostics configuration.
    </Message>

    <nav
      class="flex gap-1 border-b border-ccf-300 dark:border-slate-700"
      aria-label="Diagnostics sections"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="border-b-2 px-4 py-3 text-sm font-semibold transition-colors"
        :class="
          route.name === tab.name
            ? 'border-primary text-primary'
            : 'border-transparent text-ccf-700 hover:text-primary dark:text-slate-400'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>
