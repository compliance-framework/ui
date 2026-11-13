<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';

/** A workflow definition's JSON tab: the definition and its steps, to read, copy or download. */
const store = useWorkflowDefinitionStore();

const json = computed(() =>
  store.definition
    ? JSON.stringify(
        { definition: store.definition, steps: store.steps },
        null,
        2,
      )
    : '',
);
const fileName = computed(
  () =>
    `workflow-definition-${(store.definition?.name ?? 'definition').replace(/[^a-zA-Z0-9]/g, '_')}.json`,
);
</script>

<template>
  <CodeBlock
    v-if="store.definition"
    :code="json"
    label="Workflow definition JSON"
    :file-name="fileName"
  />
</template>
