<script setup lang="ts">
import { computed } from 'vue';
import {
  statuses,
  type StatusKey,
  type StatusTone,
} from '../StatusBadge/statuses';

/**
 * A status as a small solid pill: its name on its tone's colour, e.g. an implementation status
 * after a component's name. Lighter than StatusBadge for dense rows, and the text names the status,
 * so it isn't colour alone. `tone` overrides the vocabulary's tone where a screen groups statuses
 * differently.
 */
const props = defineProps<{ status: StatusKey; tone?: StatusTone }>();
const tone = computed(() => props.tone ?? statuses[props.status].tone);
</script>

<template>
  <span class="status-pill" :class="`status-pill--${tone}`">{{
    statuses[status].label
  }}</span>
</template>

<style scoped>
.status-pill {
  display: inline-block;
  flex: none;
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-round);
  font-size: var(--ds-font-size-caption);
  font-weight: var(--ds-font-weight-semibold);
  line-height: var(--ds-leading-snug);
  white-space: nowrap;
  color: var(--ds-color-surface-raised);
  background: var(--ds-color-text-secondary);
}

.status-pill--success {
  background: var(--ds-color-status-success-fg);
}

.status-pill--warning {
  background: var(--ds-color-status-warning-fg);
}

.status-pill--error,
.status-pill--risk-high {
  background: var(--ds-color-status-error-fg);
}

.status-pill--info {
  background: var(--ds-color-status-info-fg);
}
</style>
