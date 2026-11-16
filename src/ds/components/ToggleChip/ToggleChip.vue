<script setup lang="ts">
/**
 * A pressable chip that picks one record from a short visible set, e.g. which agent instance a
 * view shows. A button with aria-pressed; the pressed chip is marked by its border and weight,
 * not colour alone. `muted` dims a chip whose record is out of date (e.g. a stale instance);
 * say why in its content too. Attributes and listeners reach the button.
 */
withDefaults(defineProps<{ pressed: boolean; muted?: boolean }>(), {
  muted: false,
});
</script>

<template>
  <button
    type="button"
    class="toggle-chip"
    :class="{ 'toggle-chip--muted': muted }"
    :aria-pressed="pressed"
  >
    <slot />
  </button>
</template>

<style scoped>
.toggle-chip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-size-target-min);
  max-width: 100%;
  padding: var(--ds-space-1) var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  background: var(--ds-color-surface-raised);
  color: var(--ds-color-text-primary);
  font: inherit;
  font-size: var(--ds-font-size-caption);
  text-align: start;
  cursor: pointer;
}

.toggle-chip:hover {
  background: var(--ds-color-surface-hover);
}

.toggle-chip[aria-pressed='true'] {
  border-color: var(--ds-color-indicator);
  border-inline-start-width: var(--ds-border-width-indicator);
  font-weight: var(--ds-font-weight-semibold);
}

.toggle-chip--muted {
  color: var(--ds-color-text-secondary);
}

.toggle-chip:focus-visible {
  outline-offset: var(--ds-focus-offset);
}
</style>
