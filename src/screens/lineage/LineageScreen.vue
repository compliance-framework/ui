<script setup lang="ts">
import { RouterView } from 'vue-router';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

/**
 * Compliance Map (/lineage): standards → policies → controls → evidence, with each node's
 * compliance and open-risk heat, as a tree or a graph (route tabs).
 */
const tabs = [
  { label: 'Tree', to: { name: 'lineage' } },
  { label: 'Graph', to: { name: 'lineage-graph' } },
];
</script>

<template>
  <RecordTemplate
    title="Compliance Map"
    description="Standard → Policy → Controls → Evidence, with each node's compliance and open-risk heat."
    :tabs="tabs"
  >
    <RouterView />
  </RecordTemplate>
</template>
