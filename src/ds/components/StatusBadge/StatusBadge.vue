<script setup lang="ts">
import { computed } from 'vue';
import Icon from '../Icon/Icon.vue';
import { statuses, toneVars, type StatusKey } from './statuses';

/**
 * A status chip: icon + text, never colour alone (F-17 AC1, P6). Label, tone and icon come from
 * the shared vocabulary in statuses.ts (F-12 AC4, AC5). `label` overrides the text only.
 *
 * `compact` is for dense rows such as a tree: the icon (and `count`, if given) on the tone colours,
 * with the text kept for assistive technology. Each status has its own icon shape (F-12 AC5), so it
 * still isn't colour alone; use it only where a key or the full badge nearby says what each means.
 */
const props = withDefaults(
  defineProps<{
    status: StatusKey;
    label?: string;
    compact?: boolean;
    count?: number;
  }>(),
  {
    label: undefined,
    compact: false,
    count: undefined,
  },
);
const definition = computed(() => statuses[props.status]);
</script>

<template>
  <span
    class="status-badge"
    :class="[
      `status-badge--${definition.tone}`,
      { 'status-badge--compact': compact },
    ]"
    :style="toneVars(definition.tone)"
  >
    <Icon :name="definition.icon" size="sm" />
    <span v-if="compact && count !== undefined" aria-hidden="true">{{
      count
    }}</span>
    <span :class="{ 'visually-hidden': compact }">{{
      label ?? definition.label
    }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 100%;
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid currentColor;
  border-radius: var(--radius-none);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-snug);
  text-transform: uppercase;
  vertical-align: middle;
  background: var(--tone-bg);
  color: var(--tone-fg);
}

.status-badge--compact {
  padding: var(--space-1);
  flex: none;
}

.status-badge--neutral {
  border-color: var(--color-border-strong);
}
</style>
