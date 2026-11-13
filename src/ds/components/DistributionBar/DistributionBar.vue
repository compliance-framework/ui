<script setup lang="ts">
import { computed } from 'vue';
import { statuses, toneVars, type StatusKey } from '../StatusBadge/statuses';

/**
 * A slim stacked bar showing how a total splits by status, e.g. controls by implementation
 * status. It is a glance aid only (aria-hidden): the same breakdown must be in nearby text, so the
 * bar never carries meaning alone (F-17, 1.4.1). Segment colours come from the status vocabulary.
 */
const props = defineProps<{
  segments: { status: StatusKey; count: number }[];
}>();

const parts = computed(() =>
  props.segments
    .filter((segment) => segment.count > 0)
    .map((segment) => ({
      ...segment,
      vars: toneVars(statuses[segment.status].tone),
    })),
);
</script>

<template>
  <span class="distribution-bar" aria-hidden="true">
    <span
      v-for="part in parts"
      :key="part.status"
      class="distribution-bar__part"
      :style="{ ...part.vars, flexGrow: part.count }"
    />
  </span>
</template>

<style scoped>
.distribution-bar {
  display: flex;
  gap: calc(var(--ds-border-width) * 2);
  width: 100%;
  height: var(--ds-space-2);
}

.distribution-bar__part {
  flex-basis: 0;
  min-width: var(--ds-space-1);
  background: var(--tone-fg);
}
</style>
