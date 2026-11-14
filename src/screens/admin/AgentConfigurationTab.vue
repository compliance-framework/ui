<script setup lang="ts">
/**
 * An agent's Configuration tab: the classic configuration editor (a legacy island) with its
 * effective view, editor, history and instances. It is its own chunk, fetched when the tab opens.
 */
import { defineAsyncComponent } from 'vue';
import type { Agent } from '@/types/agents';
import LegacyPage from '@/views/layouts/LegacyPage.vue';

defineProps<{ agent: Agent }>();

const AgentConfigTab = defineAsyncComponent(
  () => import('@/components/agents/config/AgentConfigTab.vue'),
);
</script>

<template>
  <LegacyPage>
    <AgentConfigTab :key="agent.id" :agent="agent" />
  </LegacyPage>
</template>
