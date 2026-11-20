<script setup lang="ts">
import { computed } from 'vue';
import Tooltip from '../Tooltip/Tooltip.vue';
import { statuses, type StatusKey } from '../StatusBadge/statuses';

/**
 * Counts per status as one capsule of solid segments, each its number on its tone's colour, e.g.
 * evidence results: satisfied, unknown, not satisfied. Every segment shows, zeros too, so a
 * segment's place says which status it is as well as its colour; the counts in words are its
 * accessible text and its tooltip (hover or focus).
 */
const props = defineProps<{
  segments: { status: StatusKey; count: number }[];
}>();

const words = computed(() =>
  props.segments
    .map(
      ({ status, count }) => `${count} ${statuses[status].label.toLowerCase()}`,
    )
    .join(', '),
);
</script>

<template>
  <Tooltip :text="words">
    <span class="status-capsule" tabindex="0">
      <span
        v-for="segment in segments"
        :key="segment.status"
        class="status-capsule__segment"
        :class="`status-capsule__segment--${statuses[segment.status].tone}`"
        aria-hidden="true"
        >{{ segment.count }}</span
      >
      <span class="visually-hidden">{{ words }}</span>
    </span>
  </Tooltip>
</template>

<style scoped>
.status-capsule {
  position: relative;
  display: inline-flex;
  flex: none;
  gap: var(--ds-border-width);
  overflow: hidden;
  border-radius: var(--ds-radius-round);
  font-size: var(--ds-font-size-caption);
  font-variant-numeric: tabular-nums;
  line-height: var(--ds-leading-snug);
  vertical-align: middle;
  cursor: help;
}

.status-capsule__segment {
  min-width: var(--ds-space-8);
  padding: 0 var(--ds-space-2);
  text-align: center;
  color: var(--ds-color-surface-raised);
  background: var(--ds-color-text-secondary);
}

.status-capsule__segment--success {
  background: var(--ds-color-status-success-fg);
}

.status-capsule__segment--error {
  background: var(--ds-color-status-error-fg);
}

.status-capsule__segment--warning {
  background: var(--ds-color-status-warning-fg);
}

.status-capsule__segment--info {
  background: var(--ds-color-status-info-fg);
}
</style>
