<script setup lang="ts">
import { computed } from 'vue';
import Text from '@/ds/components/Text/Text.vue';
import { labelFor } from './constants';

// Renders a server code through a label table; an unknown code renders verbatim as code, so a
// new server code never breaks the UI.
const props = defineProps<{
  labels: Record<string, string>;
  code?: string | null;
}>();

const label = computed(() => labelFor(props.labels, props.code));
</script>

<template>
  <Text v-if="label" as="span" :title="code ?? undefined">{{ label }}</Text>
  <Text v-else-if="code" as="code" variant="code">{{ code }}</Text>
</template>
