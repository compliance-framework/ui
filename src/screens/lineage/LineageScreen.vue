<script setup lang="ts">
import { RouterView } from 'vue-router';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

/**
 * Compliance Map (/lineage): standards → policies → controls → evidence, with each node's
 * compliance and open-risk heat, as a tree or a graph (route tabs). Both views, their scope bar
 * and the node drawer are classic islands.
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
    <LegacyPage>
      <RouterView />
    </LegacyPage>
  </RecordTemplate>
</template>
