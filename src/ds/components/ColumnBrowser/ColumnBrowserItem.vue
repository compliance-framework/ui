<script setup lang="ts">
/**
 * One item in a ColumnBrowser column: a raised card, marked when its children are the column to
 * the right (`selected`: a strong border and the accent indicator, never colour alone, as the
 * item's own button also says so).
 */
withDefaults(defineProps<{ selected?: boolean }>(), { selected: false });
</script>

<template>
  <div
    class="column-browser-item"
    :class="{ 'column-browser-item--selected': selected }"
  >
    <slot />
  </div>
</template>

<style scoped>
.column-browser-item {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-left-width: var(--ds-border-width-indicator);
  border-radius: var(--ds-radius-none);
  background: var(--ds-color-surface-raised);
}
.column-browser-item--selected {
  border-color: var(--ds-color-border-strong);
  border-left-color: var(--ds-color-indicator);
}
</style>
