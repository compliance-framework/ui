<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';

/**
 * A workflow instance's JSON tab: the instance, its role assignments and its ten most recent
 * runs, to read, copy or download.
 */
const store = useWorkflowInstanceStore();

const json = computed(() =>
  store.instance
    ? JSON.stringify(
        {
          instance: store.instance,
          roleAssignments: store.roleAssignments,
          recentExecutions: store.executions.slice(0, 10),
        },
        null,
        2,
      )
    : '',
);
const fileName = computed(
  () =>
    `workflow-instance-${(store.instance?.name ?? 'instance').replace(/[^a-zA-Z0-9]/g, '_')}.json`,
);
</script>

<template>
  <CodeBlock
    v-if="store.instance"
    :code="json"
    label="Workflow instance JSON"
    :file-name="fileName"
  />
</template>
