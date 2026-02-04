<template>
  <PageHeader>Workflow Definition</PageHeader>

  <!-- Loading State -->
  <template v-if="store.isLoading">
    <PageSubHeader>Loading workflow definition...</PageSubHeader>
    <div class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
    </div>
  </template>

  <!-- Error State -->
  <template v-else-if="store.error">
    <PageSubHeader>Error loading workflow definition</PageSubHeader>
    <Message severity="error" class="mt-4">
      {{ store.error }}
    </Message>
    <div class="mt-4">
      <RouterLinkButton :to="{ name: 'workflow:index' }">
        Back to Definitions
      </RouterLinkButton>
    </div>
  </template>

  <!-- Definition Loaded -->
  <template v-else-if="store.definition">
    <PageSubHeader>{{ store.definition.name }}</PageSubHeader>

    <p
      v-if="store.definition.description"
      class="mt-2 text-gray-600 dark:text-slate-400"
    >
      {{ store.definition.description }}
    </p>

    <!-- Status Badge -->
    <div class="mt-2">
      <Badge :severity="getStatusSeverity(store.definition.status)">
        {{ store.definition.status }}
      </Badge>
      <span class="ml-4 text-sm text-gray-500 dark:text-slate-400">
        Version {{ store.definition.version || '1.0.0' }}
      </span>
    </div>

    <!-- Navigation Tabs -->
    <div
      class="mt-6 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap"
    >
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-definition-overview',
          params: { id: store.definition.id },
        }"
      >
        Overview
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-definition-steps',
          params: { id: store.definition.id },
        }"
      >
        Steps
        <span
          class="ml-1 text-sm text-gray-500 dark:text-slate-400"
          v-if="store.steps.length > 0"
        >
          ({{ store.steps.length }})
        </span>
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-definition-controls',
          params: { id: store.definition.id },
        }"
      >
        Controls
      </RouterLink>
      <RouterLink
        class="tab-link px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{
          name: 'workflow-definition-json',
          params: { id: store.definition.id },
        }"
      >
        JSON
      </RouterLink>
    </div>

    <!-- Child Route Content -->
    <div class="my-4">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
  </template>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import type { WorkflowDefinitionStatus } from '@/types/workflows';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Badge from '@/volt/Badge.vue';
import Message from '@/volt/Message.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';

const route = useRoute();
const router = useRouter();
const store = useWorkflowDefinitionStore();

function getStatusSeverity(
  status: WorkflowDefinitionStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    WorkflowDefinitionStatus,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    draft: 'secondary',
    published: 'success',
    deprecated: 'warn',
  };
  return severities[status] || 'secondary';
}

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
</script>

<style scoped>
.tab-link.router-link-exact-active {
  background: none;
  border-bottom: 2px solid;
}

.dark .tab-link.router-link-exact-active {
  background-color: rgb(15 23 42); /* slate-900 */
}
</style>
