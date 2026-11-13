<script setup lang="ts">
/**
 * A workflow definition (/workflow-definitions/:id/...): status, version and its sections as route
 * tabs. The classic page's logic is kept; the sections (overview, steps, controls, JSON) are
 * classic islands until rebuilt.
 */
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

import { computed, watch, onUnmounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';

const route = useRoute();
const router = useRouter();
const store = useWorkflowDefinitionStore();

// Load definition when route changes
watch(
  () => route.params.id,
  async (id) => {
    if (id && typeof id === 'string') {
      await store.loadDefinition(id);
      if (store.error) {
        // Redirect to list on error
        router.push({ name: 'workflow:index' });
      }
    }
  },
  { immediate: true },
);

// Clear store when leaving
onUnmounted(() => {
  store.clear();
});

const tabs = computed(() => {
  const id = store.definition?.id;
  if (!id) return [];
  return [
    {
      label: 'Overview',
      to: { name: 'workflow-definition-overview', params: { id } },
    },
    {
      label: 'Steps',
      to: { name: 'workflow-definition-steps', params: { id } },
      count: store.steps.length || undefined,
    },
    {
      label: 'Controls',
      to: { name: 'workflow-definition-controls', params: { id } },
    },
    { label: 'JSON', to: { name: 'workflow-definition-json', params: { id } } },
  ];
});
</script>

<template>
  <DataState
    v-if="!store.definition"
    :status="store.error ? 'error' : 'loading'"
    subject="this workflow definition"
    :error-message="store.error ? String(store.error) : undefined"
    skeleton="panel"
  />
  <RecordTemplate
    v-else
    :title="store.definition.name"
    :description="store.definition.description"
    :tabs="tabs"
  >
    <template #status>
      <Tag :label="store.definition.status" />
      <Text as="span" variant="caption"
        >Version {{ store.definition.version || '1.0.0' }}</Text
      >
    </template>
    <LegacyPage>
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </LegacyPage>
  </RecordTemplate>
</template>
