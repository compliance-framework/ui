<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import DistributionBar from '../DistributionBar/DistributionBar.vue';
import { countsSentence, type StatusKey } from '../StatusBadge/statuses';

/**
 * A labelled metric that says what it counts and links to the filtered list behind it
 * (F-06 AC4, F-17, P1). Compact, so a row of four fits above the fold. `segments` adds a slim bar
 * and states the same breakdown in words from the shared status vocabulary (F-12 AC4), so the bar
 * is never colour alone (P6); statuses with no items are left out, and so is the bar when all are
 * zero. `description` adds context in one short line, e.g. "32 items" or why a value is empty.
 * The whole tile is one link.
 */
const props = defineProps<{
  label: string;
  value: string;
  description?: string;
  to: RouteLocationRaw;
  segments?: { status: StatusKey; count: number }[];
}>();

/** The breakdown without its empty statuses: zeros are noise under a bar. */
const shown = computed(() =>
  (props.segments ?? []).filter((segment) => segment.count > 0),
);
const caption = computed(() =>
  [props.description, countsSentence(shown.value)].filter(Boolean).join(' · '),
);
</script>

<template>
  <RouterLink :to="to" class="metric-tile">
    <span class="metric-tile__label">{{ label }}</span>
    <span class="metric-tile__value">{{ value }}</span>
    <DistributionBar v-if="shown.length" :segments="shown" />
    <span v-if="caption" class="metric-tile__description">{{ caption }}</span>
  </RouterLink>
</template>

<style scoped>
.metric-tile {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  min-width: 0;
  padding: var(--ds-space-3) var(--ds-space-4);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-left: var(--ds-border-width-indicator) solid var(--ds-color-indicator);
  background: var(--ds-color-surface-raised);
  color: var(--ds-color-text-primary);
  text-decoration: none;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.metric-tile:hover {
  background: var(--ds-color-surface-hover);
}

.metric-tile:hover .metric-tile__label {
  text-decoration: underline;
}

.metric-tile__label {
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

.metric-tile__value {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-metric);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-leading-tight);
}

.metric-tile__description {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}
</style>
