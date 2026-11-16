<script setup lang="ts">
// A configuration document as read-only YAML with Copy and Download (CodeBlock), or a note
// when there is none.
import { computed } from 'vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { toYaml } from '@/utils/agent-config/yaml';

const props = withDefaults(
  defineProps<{
    doc: object | null;
    filename: string;
    emptyText: string;
    legend?: string;
    /** Names the code region. */
    label?: string;
  }>(),
  { legend: undefined, label: 'Configuration YAML' },
);

const isEmpty = computed(() => props.doc === null || props.doc === undefined);
const text = computed(() => (isEmpty.value ? '' : toYaml(props.doc)));
</script>

<template>
  <Stack gap="3">
    <Text v-if="legend" variant="secondary">{{ legend }}</Text>
    <Text v-if="isEmpty" variant="secondary" data-test="yaml-empty">{{
      emptyText
    }}</Text>
    <CodeBlock
      v-else
      :code="text"
      :label="label"
      :file-name="filename"
      data-test="yaml-text"
    />
  </Stack>
</template>
