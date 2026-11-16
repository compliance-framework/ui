<script setup lang="ts">
/**
 * An agent's Configuration tab: the configuration editor with its effective view, history and
 * instances. It is its own chunk (CodeMirror included), fetched when the tab opens.
 */
import { defineAsyncComponent } from 'vue';
import type { Agent } from '@/types/agents';

defineProps<{ agent: Agent }>();

const AgentConfigTab = defineAsyncComponent(
  () => import('@/screens/agents/config/AgentConfigTab.vue'),
);
</script>

<template>
  <AgentConfigTab :key="agent.id" :agent="agent" />
</template>
