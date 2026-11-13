<script setup lang="ts">
import AgentsView from '@/views/admin/AgentsView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Agents (/admin/agents): the agents that collect evidence, their service account keys and their configuration. The page body, including its actions, is the classic view (a legacy island) until it is
 * rebuilt; this screen gives it the design-system header.
 */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Agents"
      description="The agents that collect evidence: their keys and configuration."
    />
    <LegacyPage>
      <AgentsView embedded />
    </LegacyPage>
  </Stack>
</template>
