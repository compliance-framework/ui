<script setup lang="ts">
/** An agent's Overview tab: status, description, key count, last sign-in and dates. */
import { computed } from 'vue';
import type { Agent } from '@/types/agents';
import { formatDateTime } from '@/ds/format';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';

const props = defineProps<{ agent: Agent }>();

const facts = computed(() => [
  {
    key: 'status',
    label: 'Status',
    value: props.agent.isActive ? 'Active' : 'Inactive',
  },
  { key: 'description', label: 'Description', value: props.agent.description },
  {
    key: 'keys',
    label: 'Service account keys',
    value: props.agent.serviceAccountKeyCount,
  },
  {
    key: 'lastAuth',
    label: 'Last signed in',
    value: props.agent.lastAuthenticatedAt
      ? formatDateTime(props.agent.lastAuthenticatedAt)
      : 'Never',
  },
  {
    key: 'created',
    label: 'Registered',
    value: formatDateTime(props.agent.createdAt),
  },
  {
    key: 'updated',
    label: 'Last updated',
    value: formatDateTime(props.agent.updatedAt),
  },
]);
</script>

<template>
  <DescriptionList :items="facts" />
</template>
