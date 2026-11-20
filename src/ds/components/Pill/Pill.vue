<script setup lang="ts">
import type { StatusTone } from '../StatusBadge/statuses';

/**
 * A short label as a small solid pill on a tone's colour, e.g. "Evidence" beside a component.
 * For a status, use StatusPill, which takes its name and tone from the status vocabulary. The
 * label must say what the pill means: the colour only supports it.
 */
withDefaults(defineProps<{ label: string; tone?: StatusTone }>(), {
  tone: 'neutral',
});
</script>

<template>
  <span class="pill" :class="`pill--${tone}`">{{ label }}</span>
</template>

<style scoped>
.pill {
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

.pill--success {
  background: var(--ds-color-status-success-fg);
}

.pill--warning {
  background: var(--ds-color-status-warning-fg);
}

.pill--error,
.pill--risk-high {
  background: var(--ds-color-status-error-fg);
}

.pill--info {
  background: var(--ds-color-status-info-fg);
}
</style>
