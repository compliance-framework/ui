<template>
  <span v-if="label" :title="code ?? undefined">{{ label }}</span>
  <code v-else-if="code" class="font-mono text-xs">{{ code }}</code>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { labelFor } from './constants';

// Renders a server code through a label table; an unknown code renders verbatim in
// monospace so a new server code never breaks the UI.
const props = defineProps<{
  labels: Record<string, string>;
  code?: string | null;
}>();

const label = computed(() => labelFor(props.labels, props.code));
</script>
