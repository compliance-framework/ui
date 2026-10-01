<template>
  <AgentPoliciesPage :key="agentId" :agent-id="agentId" />
</template>

<script setup lang="ts">
// R68: /admin/agents/:id/policies. Vue Router reuses this component when only `:id`
// changes; the page's workspace and draft are bound to one agent, so it is re-created per
// id (keyed) and can never adopt or save another agent's config into this agent's draft.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AgentPoliciesPage from '@/components/agents/policies/AgentPoliciesPage.vue';

const props = defineProps<{ id?: string }>();
const route = useRoute();
const agentId = computed(() => props.id ?? String(route.params.id ?? ''));
</script>
